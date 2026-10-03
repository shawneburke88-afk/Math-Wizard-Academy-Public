// App controller: home screen <-> world, and everything that happens in the world (encounters, NPCs, rewards).
import { load, persist, requestPersistence, currentFamily, flushCloud, closeFamily, families, backupDue } from './core/save.js';
import { prepareWhatsNew } from './ui/whatsnew.js';
import { checkLastLoad, takeLoadFailure, loadStep, loadDone, loadSettled, liteMode } from './core/loadguard.js';
import { showWelcome } from './ui/welcome.js';
import { clearUI, toast, banner, h, mount } from './ui/dom.js';
import { showHome } from './ui/home.js';
import { showParent, showParentGate, autoBackup, offerBackup } from './ui/parent.js';
import { startOverworld, stopOverworld, worldScene, sleepWorld } from './game/overworld.js';
import { showHud, hideHud, showQuestTracker, talk, celebrate, openTeam, openBag, openQuests, openBook, openMap, openMenu, openShop, openCoins, dialog } from './ui/hud.js';
import { runBattle, snapshot } from './ui/battle.js';
import { showResults } from './ui/results.js';
import { tip, seen, tipsOn } from './ui/tutorial.js';
import { askQuestion } from './ui/question.js';
import { runPendingLesson, openAcademy } from './ui/lesson.js';
import { runSprint } from './ui/sprint.js';
import { track, setPlayer, flush as flushPlaydata } from './core/telemetry.js';
import { sprintRewards, TIERS } from './content/mentalmath.js';
import { SPECIES, ELEMENTS, speciesName, stageForLevel, strongAgainst, weakAgainst } from './content/species.js';
import { REGION_SPECIES, FEATURES, areaById, START, AREAS, SUBZONES, guardianWakeCount, depthLabel } from './content/world.js';
import { rollDrop, giveItem, makeItem } from './content/items.js';
import { makeQuestion, skillsForStrand, loadCurriculum } from './content/curriculum.js';
import { recordAnswer, enforceCaps } from './core/adaptive.js';
import { speciesUnlocked, readyToEvolve, newPet, addPet, teamPets, healTeam, restAfterBattle, fullStats, wildStage, pickWildSpecies, keeperAwake, wakeProgress, areaPet, areaShift, REGIONS, area2Done, deepAreasOpen, setActiveProfile, dailyRecord, REST_HEAL, enterArea, bump, guardianAwake, sessionCheck, startSession, autoRead, objectiveProgress, areaState } from './game/progress.js';
import { mulberry32, newSeed, randRange } from './core/rng.js';
import { speak, setSpeechEnabled } from './core/speech.js';
import { sfx, setSound, unlockAudio } from './core/sfx.js';
import { playMusic } from './core/music.js';
import { mountAudioControl } from './ui/audiocontrol.js';
import { showSandbox } from './ui/sandbox.js';
import { npcSVG } from './art/wizard.js';
import { creatureSVG, guardianSVG } from './art/creatures.js';
import { FRAC_CSS } from './art/visuals.js';

let P = null;              // active profile
let currentArea = null;
let busy = false;          // a battle/dialog is in progress
let sessionStart = 0;      // when the current wizard started playing (for play data)
let playTimer = null;
// Soft-lock guard: the world is frozen while a window (menu, dialog, battle, question…) is open, and each flow unfreezes
// it when it ends. If two flows overlap, the last one can skip the unfreeze and leave the wizard unable to walk (a test
// bot hit this). So if the world stays frozen with nothing open and nothing busy for ~4 seconds, unfreeze it.
let frozenIdle = 0;
setInterval(() => {
  const scene = P && worldScene();
  if (!scene?.frozen || busy || document.querySelector('.modal-back, .dialog, .celebrate, .results, .battle, .qcard, .tut, .lesson, .sprint, .create, .welcome')) { frozenIdle = 0; return; }
  if (++frozenIdle >= 2) { frozenIdle = 0; scene.freeze(false); }
}, 2000);
const rand = mulberry32(newSeed());

// ---------- boot ----------
async function boot() {
  const st = document.createElement('style'); st.textContent = FRAC_CSS; document.head.appendChild(st);
  load();
  await loadCurriculum();
  requestPersistence();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // Updates: the offline cache serves the old version first, then installs the new one in the background. When the
    // new one takes over, reload into it right away if nobody is in the middle of playing (welcome / family screen),
    // otherwise the next time they come back to the family screen.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;   // first install: already running the newest files
      updateReady = true;
      if (!P) location.reload();
    });
    navigator.serviceWorker.register('sw.js').then((r) => r.update?.()).catch((e) => console.warn('SW registration failed', e));
  }
  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.addEventListener('mousedown', unlockAudio, { once: true });
  hideBoot();
  mountAudioControl();
  playMusic('academy');
  prepareWhatsNew({ hadPlayed: families().length > 0 });
  const failed = checkLastLoad();
  showWelcome({ onOpen: goHome });
  if (failed) setTimeout(() => toast('Last time the world didn’t finish opening, so this device now uses lighter graphics.'), 1500);
}
let updateReady = false;
/** Which music plays in an area: the town uses the Academy theme. */
const musicFor = (area) => (area && area.region !== 'hub' ? area.region : 'academy');

function hideBoot() {
  const b = document.getElementById('boot');
  if (!b) return;
  b.classList.add('hide');
  setTimeout(() => b.remove(), 500);
}

function goHome() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  if (P) { track('session_end', { ms: Date.now() - (sessionStart || Date.now()), wiz: P.wizard.level, pets: P.pets.length }); persist(); flushPlaydata(); flushCloud(); P = null; setActiveProfile(null); }
  stopOverworld();
  loadSettled();
  if (updateReady) { location.reload(); return; }   // a new version arrived while playing: switch to it now (progress is saved)
  hideHud();
  clearUI();
  playMusic('academy');
  if (!currentFamily()) { showWelcome({ onOpen: goHome }); return; }
  showHome({
    onPlay: (p, info) => enterWorld(p, info),
    onParent: () => showParentGate({ onPass: openGrownups, onCancel: goHome }),
    onSwitch: () => { closeFamily(); showWelcome({ onOpen: goHome }); },
  });
  // Backups: when there's new progress, update the remembered backup file by itself if the browser allows it,
  // otherwise offer a one-tap "Save a backup?" box.
  if (backupDue()) autoBackup().then((ok) => { if (!ok && backupDue() && document.querySelector('.profiles')) offerBackup({ onDone: () => { if (document.querySelector('.profiles') && !document.querySelector('.modal-back')) goHome(); } }); else if (ok && document.querySelector('.profiles')) goHome(); });
}

function openGrownups() {
  showParent({ onExit: goHome, onSandbox: () => showSandbox({ onPlay: (p) => enterWorld(p), onBack: openGrownups }) });
}

// ---------- world ----------
function enterWorld(profile, info = {}) {
  P = profile;
  setActiveProfile(P);
  setPlayer({ profileId: profile.id, familyId: currentFamily()?.id, grade: profile.grade, share: currentFamily()?.shareData !== false, test: !!profile.test });
  const failed = takeLoadFailure();
  if (failed) { track('load_fail', failed); flushPlaydata(); }
  loadStep('start');
  track('session_start', { wiz: profile.wizard.level, pets: profile.pets.length, team: teamPets(profile).map((p) => [p.species, p.level, p.stage]), coins: profile.coins, items: profile.items.length });
  sessionStart = Date.now();
  enforceCaps(P);
  P.lastPlayed = Date.now();
  setSound(true);   // sound is now set per device from the 🎵 control
  setSpeechEnabled(true);
  clearUI();
  const loading = mount(h('div.boot', h('div.boot-star', '✦'), h('div.boot-title', `Welcome, ${P.name}!`), h('div.boot-sub', 'Opening the world…')));
  if (info.isNew) {
    const starter = newPet(P.starter, 3, { area: 'hub' });
    addPet(P, starter);
    P.pos = { x: START.x, y: START.y, facing: 'up' };
  }
  healTeamIfNeeded();
  startSession();
  playTimer = setInterval(() => { if (P && document.visibilityState === 'visible') { P.stats.playMs += 30000; dailyRecord(P).play += 0.5; persist(); } }, 30000);
  startOverworld(P, {
    onReady: async () => {
      track('world_load', { ms: loadDone(), lite: liteMode(), dpr: window.devicePixelRatio || 1 });
      loading.remove();
      refreshHud();
      if (info.isNew) await introStory();
    },
    onAreaChange: (a, initial) => onAreaChange(a, initial),
    onEncounter: (a) => wildBattle(a),
    onInteract: (e) => interact(e),
    onDiscover: (e) => { sfx.discover(); toast(e.type === 'chest' ? '✦ You found a hidden challenge chest!' : `✦ You spotted a rare ${SPECIES[e.data.species].names[0]}!`); worldTip(e.type === 'chest' ? 'discoverChest' : 'discoverPet'); },
    onNear: (kind, e) => { if (kind === 'portal') findPortal(e.area); worldTip(kind); },
    onStep: () => { if (Math.random() < 0.1) persist(); },
  });
}

function healTeamIfNeeded() { if (teamPets(P).every((p) => p.hp <= 0)) healTeam(P); }

function refreshHud() {
  showHud(P, {
    openMenu: () => openMenu(P, {
      onExit: goHome,
      onToggleRead: (v) => { P.settings.autoRead = v; persist(); },
      onToggleSound: (v) => { P.settings.sound = v; setSound(v); persist(); },
    }),
    openTeam: () => withFrozen(() => openTeam(P, { onChange: refreshHud })),
    openBag: () => withFrozen(() => openBag(P, { onChange: refreshHud })),
    openQuests: () => withFrozen(() => openQuests(P, currentArea?.id)),
    openBook: () => withFrozen(() => openBook(P)),
    openAcademy: () => withFrozen(() => openAcademy(P, { autoRead: autoRead(P) })),
    openMap: () => withFrozen(() => openMap(P, worldScene(), { atPortal: false, onTravel: travel })),
    openCoins: () => withFrozen(() => openCoins(P)),
  });
  if (currentArea) showQuestTracker(P, currentArea.id);
}

// Freeze world movement while a modal is open; unfreeze when it closes.
function withFrozen(open) {
  const scene = worldScene();
  scene?.freeze(true);
  open();
  const obs = new MutationObserver(() => {
    if (!document.querySelector('.modal-back') && !busy) { scene?.freeze(false); obs.disconnect(); refreshHud(); }
  });
  obs.observe(document.getElementById('ui'), { childList: true, subtree: false });
}

function onAreaChange(a, initial) {
  currentArea = a;
  playMusic(musicFor(a));
  const anchorsBefore = JSON.stringify(P.strandAnchor || {});
  const first = enterArea(P, a.id);
  // A tier's levels were just set from the team's level: bring its roaming pets and blockers up to match.
  if (JSON.stringify(P.strandAnchor || {}) !== anchorsBefore) worldScene()?.rescaleRegion(a.region);
  if (!initial || first) banner(a.name, a.level ? `${regionLabel(a.region)} · ${depthLabel(a)}` : 'Home base');
  if (first && a.level > 0) setTimeout(() => { toast('New quests! Tap 📜 Quests to see them.'); worldTip('region'); }, 1500);
  refreshHud();
}
const regionLabel = (r) => ({ number: 'Number Sense', patterns: 'Patterns and Relations', shape: 'Shape and Space', stats: 'Statistics and Probability' }[r] || '');

// Show a first-time tip in the open world, pausing movement while Hoot talks.
async function worldTip(id) {
  if (!P || busy || !tipsOn(P) || seen(P, id)) return;
  const scene = worldScene();
  scene?.freeze(true);
  await tip(P, id);
  if (!busy && !document.querySelector('.modal-back, .dialog, .celebrate, .results, .battle')) scene?.freeze(false);
}

async function introStory() {
  const scene = worldScene();
  scene?.freeze(true);
  busy = true;
  const pet = teamPets(P)[0];
  await talk(P, 'Professor Hypatia', 'professor', [
    `Welcome to the Math Wizard Academy, ${P.name}!`,
    `Your first pet, ${speciesName(pet)}, is ready for adventure. Pets get stronger when YOU answer math questions.`,
    'Four regions surround the Academy, one for each part of math: Number Sense to the north, Patterns to the east, Shape and Space to the south, and Statistics to the west.',
    'Walk through tall grass to meet wild pets. Answer questions to cast spells and befriend them. Tap anywhere to walk!',
    'My owl Hoot will fly along with you and explain things as you go. Good luck!',
  ]);
  await tip(P, 'walk');
  await tip(P, 'hud');
  await tip(P, 'fog');
  await tip(P, 'healer');
  busy = false;
  scene?.freeze(false);
}

// ---------- encounters ----------
function teamLevel() {
  const t = teamPets(P);
  return t.length ? Math.round(t.reduce((s, p) => s + p.level, 0) / t.length) : 1;
}

// Wild groups: mostly single pets in the first subzone, bigger packs (sometimes with a leader) deeper in [TUNABLE].
const GROUP_ODDS = { 1: [0.62, 0.92], 2: [0.5, 0.88], 3: [0.38, 0.78], 4: [0.3, 0.7] };   // chance of 1 pet, of ≤ 2 pets
function wildGroup(area, firstSpecies, firstLevel, firstStage) {
  const r = rand();
  const [one, two] = GROUP_ODDS[area.level] || GROUP_ODDS[1];
  // Never more wild pets than your pets + 1, and a wizard with only a starter meets them one at a time (the test
  // playthrough lost its very first battle to two pets while answering every question right).
  const nPets = teamPets(P).length;
  // v47: and one at a time until the team averages level 5 (a test bot lost its 2nd battle to a pair while answering 8 of 9).
  const size = Math.min(r < one ? 1 : r < two ? 2 : 3, nPets <= 1 || teamLevel() < 5 ? 1 : nPets + 1);
  const [lo, hi] = areaPet(P, area), shift = areaShift(P, area);
  const base = firstLevel || Math.max(lo, Math.min(hi + 2, teamLevel() + randRange(rand, -2, 1)));
  const first = firstSpecies || pickWildSpecies(P, area, [], rand) || 'numberling';
  const group = [{ species: first, level: base, stage: firstStage || wildStage(P, first, base - shift, area.level, rand) }];
  for (let i = 1; i < size; i++) { const sp = pickWildSpecies(P, area, group.map((g) => g.species), rand) || first, lv = Math.max(1, base - randRange(rand, 0, 2)); group.push({ species: sp, level: lv, stage: wildStage(P, sp, lv - shift, area.level, rand) }); }
  if (size === 3 && rand() < (area.level <= 2 ? 0.25 : 0.5)) group[0].leader = true;
  // At most two evolved pets in one group: fully evolved trios wiped test teams that answered every question right.
  const evolvedIdx = group.map((g, i) => (g.stage > stageForLevel(g.species, Math.max(1, g.level - shift)) ? i : -1)).filter((i) => i >= 0);
  for (const i of evolvedIdx.slice(2)) group[i].stage = stageForLevel(group[i].species, Math.max(1, group[i].level - shift));
  return group;
}

async function wildBattle(area, { species = null, entity = null } = {}) {
  if (busy) return;
  busy = true;
  const res = await battle({ kind: 'wild', area, enemies: wildGroup(area, species, entity?.level, entity?.stage) });
  // The roaming pet leaves the map either way; a new one wanders in later.
  if (entity) worldScene()?.removeEntity(entity, { counted: res.result === 'win' || res.result === 'caught' });
  if (res.result === 'win' || res.result === 'caught') {
    // Every wild pet beaten OR befriended counts toward "Win N battles" (befriending is a win too).
    for (let i = 0; i < (res.enemyCount || 1); i++) bump(P, area.id, 'wins');
    recordCatches(res, area);
  }
  await afterBattle(res, 'wild', area);
  busy = false;
  worldDone();
}

function recordCatches(res, area) {
  for (const pet of res.caughtList || []) {
    const strand = SPECIES[pet.species].strand;
    bump(P, area.id, 'befriend', { strand });
    if (strand !== area.region) bump(P, area.id, 'wanderer');
  }
}

async function blockerBattle(e) {
  const b = e.data;
  const area = areaById(b.areaId);
  const group = b.group.slice(0, 3);
  const names = group.map((sp) => SPECIES[sp].names[0]);
  if (b.keeper) return keeperBattle(e, area, group, names);
  const ok = await dialog({ who: 'Wild pets!', portrait: creatureSVG(group[0], 1, {}), text: group.length > 1 ? `${names.join(', ')} are blocking the path! Battle them to get through.` : `A wild ${names[0]} is blocking the path! Battle it to get through.`, choices: [{ label: 'Battle!', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  const leader = group.length >= 2 && (b.guards === 'main2' || b.guards === 'guardian');
  const shift = areaShift(P, area);
  const res = await battle({ kind: 'blocker', area, bossId: b.id, enemies: group.map((species, i) => { const lv = b.level + (i > 0 ? randRange(rand, -1, 0) : 0); return { species, level: lv + shift, stage: stageForLevel(species, lv), leader: leader && i === 0 }; }) });
  if (res.result === 'win' || res.result === 'caught') {
    P.beaten[b.id] = true;
    worldScene()?.removeEntity(e);
    for (let i = 0; i < group.length; i++) bump(P, area.id, 'wins');
    recordCatches(res, area);
    await afterBattle(res, 'wild', area, { sub: 'The path is clear!' });
  } else await afterBattle(res, 'wild', area);
}

/** A Challenge: stronger pets guarding the way into the next subzone. They wait until most quests here are done. */
async function keeperBattle(e, area, group, names) {
  const b = e.data;
  const next = areaById(b.to);
  if (b.mini) return miniGuardian(e, area, next);
  if (!keeperAwake(P, area.id)) {
    await dialog({ who: 'Challenge', portrait: creatureSVG(group[0], 2, {}), text: `${names.join(', ')} guard the way to ${next.name}. They only battle wizards who have explored ${area.name}: finish ${guardianWakeCount(area.id)} quests here first, including beating or befriending the wild pets (${wakeProgress(P, area.id)} done). Check 📜 Quests.`, read: autoRead(P) });
    return;
  }
  const ok = await dialog({ who: '⚔ Challenge!', portrait: creatureSVG(group[0], 2, {}), text: `${names.join(', ')} guard the way to ${next.name}. They are stronger than the pets here. Win to open the path!`, choices: [{ label: 'Battle! ⚔', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  const shift = areaShift(P, next);   // a Challenge scales like the area it guards
  // The first pet leads the group (stronger, like a wild pack leader) [TUNABLE]: v43 bots won every Challenge first try.
  const res = await battle({ kind: 'blocker', area, bossId: b.id, enemies: group.map((species, i) => { const lv = b.level + (i > 0 ? randRange(rand, -1, 0) : 0); return { species, level: lv + shift, stage: stageForLevel(species, lv), leader: i === 0 }; }) });
  if (res.result === 'win' || res.result === 'caught') {
    P.beaten[b.id] = true;
    worldScene()?.removeEntity(e);
    for (let i = 0; i < group.length; i++) bump(P, area.id, 'wins');
    recordCatches(res, area);
    persist();
    await afterBattle(res, 'wild', area, { sub: `The way to ${next.name} is open!` });
    await celebrate({ title: 'Challenge complete!', sub: `The path to ${next.name} is open. Pets there are a little stronger, and so are the questions.`, button: 'Onward!' });
  } else await afterBattle(res, 'wild', area);
}

/** The Mini Guardian at the door to area 3 of every region: the mid-game milestone. It only battles once area 2 is
 *  finished in every region, so kids have practised all four kinds of math before going deeper in any of them. */
async function miniGuardian(e, area, next) {
  const b = e.data;
  const portrait = safeGuardianArt(area.region);
  if (guardianAwake(P, area.id) && !keeperAwake(P, area.id)) {
    const list = REGIONS.map((r) => `${area2Done(P, r) ? '✓' : '✗'} ${REGION_NAMES[r]}`).join(' · ');
    await dialog({ who: `🛡️ ${b.name}`, portrait, text: `Great work in ${area.name}! I guard ${next.name}, and I only battle wizards who have finished area 2 in every region: ${list}. Check 📜 Quests in each region's area 2.`, read: autoRead(P) });
    return;
  }
  if (!keeperAwake(P, area.id)) {
    await dialog({ who: `🛡️ ${b.name}`, portrait, text: `I guard ${next.name}. Explore ${area.name} first: finish ${guardianWakeCount(area.id)} quests here, including beating or befriending the wild pets (${wakeProgress(P, area.id)} done). Then finish area 2 in every other region too. Check 📜 Quests.`, read: autoRead(P) });
    return;
  }
  const ok = await dialog({ who: `🛡️ ${b.name}`, portrait, text: `You've explored every region! Now show me what you've learned about ${regionLabel(area.region)}. Beat me to open ${next.name}.`, choices: [{ label: 'Battle! 🛡️', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  // Levels [TUNABLE]: the Warden one level above the Challenge level for area 3, with two helpers at that level. It
  // scales like area 3 (the area it guards). v45: the helpers are evolved like the team's pets by now, and there are
  // two (with one unevolved helper, all 4 Wardens fell on the first try with the team near full health).
  const shift = areaShift(P, next), helper = b.group[0];
  const others = REGION_SPECIES[area.region].filter((sp) => SPECIES[sp].cls <= 2 && sp !== helper);
  const second = others.length ? others[[...b.id].reduce((n, c) => n + c.charCodeAt(0), 0) % others.length] : helper;
  // v56: never more evolved than the kid's best pet, and at most stage 2 (stage 3 helpers at Lv 28 beat a bot answering
  // 15 of 15 right).
  const topStage = Math.min(2, Math.max(1, ...teamPets(P).map((p) => p.stage || 1)));
  const enemies = [helper, second].map((sp) => ({ species: sp, level: b.level + shift, stage: Math.min(topStage, stageForLevel(sp, b.level + shift)) }));
  const res = await battle({ kind: 'guardian', area, bossId: b.id, enemies, champion: { type: 'guardian', mini: true, name: b.name, region: area.region, level: b.level + 1 + shift } });
  if (res.result === 'win') {
    P.beaten[b.id] = true;
    worldScene()?.removeEntity(e);
    bump(P, area.id, 'wins');
    persist();
    await afterBattle(res, 'challenge', area, { sub: `The way to ${next.name} is open!` });
    await celebrate({ title: `You defeated ${b.name}!`, sub: `Halfway there! ${next.name} is open. Pets there are stronger and the questions go deeper. The Guardian of ${REGION_NAMES[area.region]} waits at the far end of area 4.`, button: 'Onward!' });
    worldScene()?.refreshAll();
  } else await afterBattle(res, 'challenge', area);
}
const REGION_NAMES = { number: 'Starfall', patterns: 'Tanglewood', shape: 'Stoneworks', stats: 'Stormcoast' };
function safeGuardianArt(region) { try { return guardianSVG(region, {}); } catch (err) { return null; } }

async function battle(opts) {
  sleepWorld(true);
  hideHud();
  playMusic(musicFor(opts.area), 'battle');
  // A tired boss [TUNABLE]: each loss in a row to the same trainer, Challenge, rare pet or Guardian takes 10% off its
  // side's health next time (at most 40%). First tries stay as hard as ever, but nobody gets stuck: a v48 test bot
  // lost to one Mini Guardian 4 times running, each time close, while its training fights barely changed its level;
  // v54 raised it from 8% (max 24%) after another bot lost 4 times in a row even at -24%.
  const lost = opts.bossId ? P.bossLosses?.[opts.bossId] || 0 : 0;
  const res = await runBattle({ profile: P, ...opts, ease: 1 - Math.min(0.4, 0.1 * lost), tired: lost > 0 });
  if (opts.bossId) {
    P.bossLosses ||= {};
    if (res.result === 'lose') P.bossLosses[opts.bossId] = lost + 1;
    else if (res.result === 'win' || res.result === 'caught') delete P.bossLosses[opts.bossId];
  }
  playMusic(musicFor(opts.area));
  res.enemyCount = opts.enemies.length + (opts.champion ? 1 : 0);
  sleepWorld(false);
  refreshHud();
  return res;
}

/** Rewards, progress screen, losing, quest notices and the session check after every battle. */
async function afterBattle(res, source, area, { hints = res.hints || 0, sub = '', extraItems = [], extraCoins = 0 } = {}) {
  const won = res.result === 'win' || res.result === 'caught';
  let coins = extraCoins;
  const items = [...extraItems];
  if (won) {
    coins += ({ wild: randRange(rand, 3, 6) * (res.enemyCount || 1), trainer: 25, challenge: 15, guardian: 60, chest: 0 }[source] || 0);
    P.coins += coins;
    P.stats.battlesWon++;
    const drops = source === 'wild' ? (res.enemyCount || 1) : 1;
    for (let i = 0; i < drops; i++) { const it = giveItem(P, rollDrop(P, source, teamLevel(), rand, { hints })); if (it) items.push(it); }
  }
  const quests = checkAreaNotices(area);
  for (const it of items) track('drop', { src: source, rar: it.rarity, slot: it.slot, lv: it.level });
  if (coins) track('coins', { src: source, n: coins });
  persist();
  if (res.result !== 'run' || res.xp) {
    const title = res.result === 'caught' ? 'New friend!' : won ? 'Victory!' : res.result === 'lose' ? 'Your team needs a rest' : 'You got away';
    if (items.length) sfx.chest();
    await showResults({ profile: P, res, title, sub: sub || (res.result === 'lose' ? 'Every question you answered still counts. You’re getting stronger!' : ''), coins, items, quests, area });
  } else toast('You got away safely.');
  if (res.result !== 'lose' && restAfterBattle(P)) toast(`💚 Your pets rested and got back ${Math.round(REST_HEAL * 100)}% health.`);
  if (res.result === 'lose') {
    await dialog({ who: 'Nurse Maple', portrait: npcSVG('healer', {}), text: 'I patched your pets up! Let’s try again. Maybe practise on some wild pets first.', read: autoRead(P) });
    healTeam(P);
    const camp = area && FEATURES[area.id]?.camp;
    worldScene()?.teleport(camp ? camp.x + 2 : START.x, camp ? camp.y + 1 : START.y);
    if (camp) findPortal(area.id);
    await typeTip(res);
  }
  persist();
  await runPendingLesson(P, { autoRead: autoRead(P) });
  if (coins) await tip(P, 'coins');
  if (P.pets.some(readyToEvolve)) await tip(P, 'evolve');
  if ((res.caughtList || []).some((pt) => !P.team.includes(pt.id))) await tip(P, 'teamFull');
  if ((res.caughtList || []).some((pt) => P.pets.filter((x) => x.species === pt.species).length >= 2)) await tip(P, 'merge');
  const s = sessionCheck(P);
  if (s === 'gentle') await dialog({ who: 'Professor Hypatia', portrait: npcSVG('professor', {}), text: `You’ve been playing for ${P.settings.sessionMinutes} minutes. Great work! Your pets are getting sleepy. It’s a good time for a break.`, choices: [{ label: 'Keep playing', value: 1 }, { label: 'Take a break (go home)', value: 2, style: 'green' }], read: autoRead(P) }).then((v) => { if (v === 2) goHome(); });
  if (s === 'rest') { await dialog({ who: 'Professor Hypatia', portrait: npcSVG('professor', {}), text: `Time for a rest! Your pets need to recharge. See you in ${P.settings.restMinutes} minutes!`, read: autoRead(P) }); goHome(); }
}

const noticed = new Set();
function checkAreaNotices(area) {
  const done = [];
  if (!area || !area.level) return done;
  for (const o of objectiveProgress(P, area.id)) {
    const k = area.id + o.id;
    if (o.done && !noticed.has(k) && !(P.areas[area.id]._told || []).includes(o.id)) {
      noticed.add(k);
      (P.areas[area.id]._told ||= []).push(o.id);
      done.push(o.text);
    }
  }
  const st = areaState(P, area.id);
  if (FEATURES[area.id]?.guardian && !st.guardian && guardianAwake(P, area.id) && !st._wokeTold) {
    st._wokeTold = true;
    setTimeout(() => toast(`✦ ${FEATURES[area.id].guardian.name} has awakened! Find its shrine.`), 1200);
  }
  // Tell the kid when a Challenge wakes up (or, for the way into area 3, what it's still waiting for).
  const keeper = FEATURES[area.id]?.keeper;
  if (keeper && !P.beaten[keeper.id] && guardianAwake(P, area.id) && !st._keeperTold) {
    st._keeperTold = true;
    const ready = keeperAwake(P, area.id);
    const who = keeper.mini ? `🛡️ ${keeper.name}` : '⚔ The Challenge';
    setTimeout(() => toast(ready ? `${who} guarding ${areaById(keeper.to).name} is ready to battle!` : `✦ ${area.name} quests done! Finish area 2 in every region to wake the Mini Guardians.`), 1400);
  }
  // The mid-game milestone: area 2 finished everywhere wakes every region's Mini Guardian.
  if (area.level === 2 && deepAreasOpen(P) && !P.deepTold) {
    P.deepTold = true;
    setTimeout(() => toast('🛡️ Halfway milestone! Area 2 is done in every region, so the Mini Guardians are awake. Beat one to open its area 3.'), 2600);
  }
  worldScene()?.refreshAll();
  return done;
}

function worldDone() {
  const scene = worldScene();
  scene?.refreshAll();
  // Redraw the HUD and quest tracker so quest counts (wins, befriends, chests) show the latest progress.
  refreshHud();
  if (!document.querySelector('.modal-back, .dialog, .celebrate')) scene?.freeze(false);
  refreshHud();
}

// ---------- interactions ----------
async function interact(e) {
  if (busy) return;
  const scene = worldScene();
  scene?.freeze(true);
  busy = true;
  try {
    if (e.type === 'npc') await npc(e);
    else if (e.type === 'trainer') await trainer(e);
    else if (e.type === 'wild') { busy = false; await wildBattle(areaById(e.areaId), { species: e.species, entity: e }); return; }
    else if (e.type === 'blocker') await blockerBattle(e);
    else if (e.type === 'challenge') await challengePet(e);
    else if (e.type === 'chest') await chest(e);
    else if (e.type === 'mathchest') await mentalChest(e);
    else if (e.type === 'guardian') await guardian(e);
    else if (e.type === 'gate') await gate(e);
    else if (e.type === 'portal') {
      busy = false;
      if (e.area !== 'hub') findPortal(e.area);
      // Every portal is also a healing spot, so a kid never has to walk all the way back to Nurse Maple.
      if (P.pets.some((p) => p.hp < fullStats(P, p).maxHp)) { healTeam(P); sfx.levelUp(); toast('💖 The portal’s glow healed all your pets!'); }
      openMap(P, scene, { atPortal: true, onTravel: travel }); watchModalThenUnfreeze(); return;
    }
  } finally {
    busy = false;
    worldDone();
  }
}

function watchModalThenUnfreeze() {
  const obs = new MutationObserver(() => { if (!document.querySelector('.modal-back')) { worldScene()?.freeze(false); obs.disconnect(); } });
  obs.observe(document.getElementById('ui'), { childList: true });
}

// After a loss to a team whose element beats most of the kid's pets, Hoot explains the matchup and names a pet that
// would do better (one the kid owns, or where to befriend one). A normal tip: up to 3 times, "Don't show again" works.
async function typeTip(res) {
  const el = (sp) => SPECIES[sp]?.element;
  const team = (res.teamSpecies || []).map(el).filter(Boolean), foes = (res.foeSpecies || []).map(el).filter(Boolean);
  if (!team.length || !foes.length) return;
  const count = (list, e) => list.filter((x) => x === e).length;
  const strong = [...new Set(foes)].filter((e) => count(team, strongAgainst(e)) * 2 >= team.length).sort((a, b) => count(foes, b) - count(foes, a))[0];
  if (!strong) return;
  const E = ELEMENTS[strong], mine = ELEMENTS[strongAgainst(strong)], counter = weakAgainst(strong), C = ELEMENTS[counter];
  const text = [`Those ${E.icon} ${E.name} pets were strong against your ${mine.icon} ${mine.name} pets, so they hit harder and your attacks did less.`];
  const onTeam = teamPets(P).find((p) => el(p.species) === counter);
  const spare = P.pets.filter((p) => el(p.species) === counter && !P.team.includes(p.id)).sort((a, b) => b.level - a.level)[0];
  const home = AREAS.find((a) => a.region === C.strand && a.level === 1)?.name;
  if (onTeam) text.push(`${C.icon} ${C.name} beats ${E.icon} ${E.name}! Your ${speciesName(onTeam)} is a ${C.name} pet, so aim its attacks at them.`);
  else if (spare) text.push(`${C.icon} ${C.name} beats ${E.icon} ${E.name}! Try putting your ${speciesName(spare)} on your team from 🐾 Team before you battle them again.`);
  else text.push(`${C.icon} ${C.name} beats ${E.icon} ${E.name}! ${C.name} pets live in the ${regionLabel(C.strand)} region${home ? ` (start at ${home})` : ''}. Befriend one to bring next time.`);
  await tip(P, 'typeLoss', { text });
}

// A portal counts as found once the wizard walks up to it; then the World Map can travel there from anywhere.
function findPortal(areaId) {
  if (!areaId || areaId === 'hub' || P.portals?.[areaId]) return;
  (P.portals ||= {})[areaId] = true;
  track('portal', { area: areaId });
  persist();
  sfx.discover();
  toast(`🌀 You found the ${areaById(areaId)?.name || ''} portal! Step on it to heal your pets. Tap 🗺️ Map to travel back here any time.`);
}

function travel(areaId) {
  const f = FEATURES[areaId];
  const spot = areaId === 'hub' ? { x: FEATURES.hub.portal.x + 2, y: FEATURES.hub.portal.y + 1 } : { x: f.camp.x + 2, y: f.camp.y + 1 };
  sfx.cast();
  worldScene()?.teleport(spot.x, spot.y);
  worldScene()?.freeze(false);
}

async function npc(e) {
  const n = e.data;
  if (n.talk === 'healer') {
    healTeam(P);
    sfx.levelUp();
    await talk(P, n.name, n.kind, ['Let me heal your pets… ✨ All better! Come back any time.']);
  } else if (n.talk === 'shop') {
    const ok = await talk(P, n.name, n.kind, ['Welcome, young wizard! I trade gear for coins. Want to take a look?'], [{ label: 'Show me!', value: true, style: 'green' }, { label: 'Maybe later', value: false }]);
    if (ok) {
      const lvl = teamLevel();
      const stock = Array.from({ length: 6 }, (_, i) => makeItem(i < 4 ? 'common' : 'uncommon', lvl, rand));
      await new Promise((resolve) => { openShop(P, stock, { onChange: refreshHud }); watchClose(resolve); });
    }
  } else if (n.talk === 'professor') {
    const done = AREAS.filter((a) => a.level === SUBZONES && P.areas[a.id]?.guardian).length;
    const tips = [
      done ? `You've beaten ${done} Guardian${done > 1 ? 's' : ''}! Each one is the final boss of its region.` : 'Each region has four areas. A Mini Guardian waits at the door to area 3, and the region’s Guardian at the far end of area 4!',
      'Rare challenge pets have harder questions. They’re tough, but the reward is a rare pet!',
      'Hints are always okay. Learning is what makes a great wizard.',
      'Your pets evolve after passing an Evolution Trial. Watch for the "Evolve!" badge in your Team.',
      'Save your coins! They pay for evolving and merging pets, and for gear at Gideon’s Shop. Tap your 🪙 coins to see the prices.',
      'Every area has a glowing portal. Step on it to heal your pets, then travel back to it from the 🗺️ Map any time.',
    ];
    await talk(P, n.name, n.kind, [tips[Math.floor(Math.random() * tips.length)]]);
  }
}

function watchClose(resolve) {
  const obs = new MutationObserver(() => { if (!document.querySelector('.modal-back')) { obs.disconnect(); resolve(); } });
  obs.observe(document.getElementById('ui'), { childList: true });
}

async function trainer(e) {
  const t = e.data;
  const area = areaById(e.areaId);
  if (P.beaten[t.id]) { await talk(P, t.name, t.kind, ['Great battle earlier! Keep practising, you’re really good at this.']); return; }
  const ok = await talk(P, t.name, t.kind, [`I'm ${t.name}! Let's see how strong your pets are!`], [{ label: 'Battle!', value: true, style: 'green' }, { label: 'Not now', value: false }]);
  if (!ok) return;
  // Trainer pets sit around your team's level (one below, plus their offsets) [TUNABLE]; at your level they won too often.
  // The trainer wizard is at most 3 levels above YOUR wizard: wizards level more slowly than pets, and a trainer set
  // from pet levels outgrew the kid's wizard (the test playthrough lost to a Lv 18 trainer with a Lv 10 wizard while
  // answering 17 of 17 right, and won only narrowly when the trainer was at the team's level).
  const [lo, hi] = areaPet(P, area);
  // v41: pets one level up from v39 (trainers were won 98% of first tries) but the trainer wizard back to at most
  // 3 above yours; v40's +4 made area 1–2 trainers win about half the time against bots answering everything right.
  const base = Math.max(lo, Math.min(hi + 3, teamLevel()));
  const trainerLevel = Math.min(base, P.wizard.level + 3);
  const shift = areaShift(P, area);   // stages follow the unshifted level, as for wild pets, so a trainer in a later strand isn't evolved early
  // v49: pets +1 level (v48 bots won 94% of area 1–2 trainers after healing first). v53: only in areas 3–4. In areas 1–2
  // the +1 put trainer pets 1–2 levels above the team and beat bots answering 21 of 22 and 8 of 8 right.
  // v55: +2 in areas 3–4 (bots still won all 12 deep trainer battles, keeping ~80% health).
  // v58: +3 in areas 3–4 (+2 still won all 9 deep trainer battles).
  const lvUp = area.level >= 3 ? 2 : -1;
  const res = await battle({ kind: 'trainer', area, bossId: t.id, trainer: t, enemies: t.team.map(([species, off]) => ({ species, level: base + off + lvUp, stage: stageForLevel(species, Math.max(1, base + off + lvUp - shift)) })),
    champion: { type: 'trainer', name: t.name, kind: t.kind, level: trainerLevel } });
  if (res.result === 'win') {
    P.beaten[t.id] = true;
    bump(P, area.id, 'trainer');
    await afterBattle(res, 'trainer', area);
    await talk(P, t.name, t.kind, ['Wow, you win! Your math magic is amazing.']);
  } else await afterBattle(res, 'trainer', area);
}

async function challengePet(e) {
  const c = e.data;
  const area = areaById(e.areaId);
  const sp = SPECIES[c.species];
  const ok = await dialog({ who: `★ Rare ${sp.names[0]}`, portrait: creatureSVG(c.species, 1, { variant: 'rare' }), text: `A rare ${sp.names[0]} is watching you! Its questions are harder than usual, a real stretch. Win and it joins your team as a stronger pet. Using hints lowers the reward.`, choices: [{ label: 'Take the challenge! ★', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  // v55: +1–3 levels in area 1 (was +3–5 everywhere: a Lv 8 rare against a Lv 4 team beat every test bot there).
  const lvl = Math.max(areaPet(P, area)[1], Math.max(...teamPets(P).map((p) => p.level), 1)) + (area.level <= 1 ? randRange(rand, 1, 3) : randRange(rand, 3, 5));
  const res = await battle({ kind: 'challenge', area, bossId: c.id, enemies: [{ species: c.species, level: lvl, rare: true, stage: stageForLevel(c.species, Math.max(1, lvl - areaShift(P, area))) }] });
  if (res.result === 'win') {
    P.beaten[c.id] = true;
    const joinLevel = Math.max(areaPet(P, area)[1], lvl - (res.hints || 0));
    const pet = addPet(P, newPet(c.species, joinLevel, { rare: true, area: area.id }));
    const strand = sp.strand;
    bump(P, area.id, 'befriend', { strand });
    if (strand !== area.region) bump(P, area.id, 'wanderer');
    sfx.catch();
    await celebrate({ title: `Rare ${speciesName(pet)} joined you!`, sub: `It starts at level ${pet.level}${res.hints ? ` (−${res.hints} for hints)` : ' (no hints, full bonus!)'}.`, art: creatureSVG(pet.species, pet.stage, { variant: 'rare', mood: 'happy' }), button: 'Awesome!' });
    await afterBattle(res, 'challenge', area);
  } else if (res.result === 'lose') {
    await afterBattle(res, 'challenge', area);
  } else {
    toast('The rare pet will wait for you here.');
  }
}

/** Mental math chest: a timed sprint of quick facts. Refills daily; rewards grow with the medal earned. */
async function mentalChest(e) {
  const today = new Date().toISOString().slice(0, 10);
  const st = P.mental?.[e.id];
  if (st?.day === today) { await dialog({ who: 'Mental Math Chest', text: `You already opened this chest today (best: ${st.best}). It refills tomorrow. Try another ⏱ chest!`, read: autoRead(P) }); return; }
  const area = e.areaId === 'hub' ? { level: 0, region: 'hub' } : areaById(e.areaId);
  const seconds = P.settings.mentalTime ?? 20;
  playMusic(musicFor(area), 'battle');
  const res = await runSprint({ grade: P.grade, level: area.level >= 3 ? 2 : area.level ? 1 : 0, zone: area.region, seconds, best: st?.best || 0, autoRead: autoRead(P) });
  playMusic(musicFor(area));
  if (!res) return;
  const { correct, wrong, tier } = res;
  const reward = sprintRewards(correct, tier, area.level);
  const newBest = !!st && correct > (st.best || 0);
  let coins = reward.coins + (newBest ? 5 : 0);
  const items = [];
  for (const key of reward.items) { const it = giveItem(P, rollDrop(P, key, teamLevel(), rand)); if (it) items.push(it); }
  P.coins += coins;
  (P.mental ||= {})[e.id] = { day: today, best: Math.max(correct, st?.best || 0) };
  P.stats.sprints = (P.stats.sprints || 0) + 1;
  track('sprint', { area: e.areaId, secs: seconds, ok: correct, wrong, tier, coins, items: items.map((i) => i.rarity), best: !!newBest });
  (P.sprintLog ||= []).push({ t: Date.now(), area: e.areaId, secs: seconds, ok: correct, wrong, tier });
  if (P.sprintLog.length > 60) P.sprintLog.splice(0, P.sprintLog.length - 60);
  for (const it of items) track('drop', { src: 'mental', rar: it.rarity, slot: it.slot, lv: it.level });
  P.stats.sprintBest = Math.max(P.stats.sprintBest || 0, correct);
  if (items.length || tier >= 0) sfx.chest();
  persist();
  worldScene()?.refreshAll();
  const snap = snapshot(P);
  const title = tier >= 0 ? `${TIERS[tier].icon} ${TIERS[tier].name} medal!` : 'Nice try!';
  const sub = `${correct} right in ${seconds} seconds${wrong ? ` (${wrong} wrong)` : ''}${newBest ? ' · New best! +5 coins' : ''}${tier < 0 ? ` · ${res.thresholds[0]} right earns Bronze` : ''}`;
  await showResults({ profile: P, res: { xp: 0, before: snap, after: snap }, title, sub, coins, items, quests: [], area: areaById(e.areaId) });
}

async function chest(e) {
  const area = areaById(e.areaId);
  if (P.opened[e.id]) { toast('This chest is already open.'); return; }
  const ok = await dialog({ who: 'Challenge Chest', portrait: null, text: 'A magic seal protects this chest! Solve 3 challenge questions and get at least 2 right to open it. Hints lower the treasure.', choices: [{ label: 'Try the seal ★', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  let right = 0, hints = 0;
  const cands = skillsForStrand(P, area.region);
  for (let i = 0; i < 3; i++) {
    const qi = makeQuestion(P, { candidates: cands.length ? cands : undefined, mode: 'challenge' });
    const r = await askQuestion(qi, { autoRead: autoRead(P), profile: P, title: `Chest seal · ${i + 1} of 3 · ${right} right` });
    if (r.hinted) hints++;
    if (r.correct) right++;
    recordAnswer(P, qi.skill.id, r.correct, { mode: 'challenge', tier: qi.tier, hinted: r.hinted });
  }
  if (right >= 2) {
    P.opened[e.id] = true;
    bump(P, area.id, 'chest');
    const item = giveItem(P, rollDrop(P, 'chest', teamLevel(), rand, { hints }));
    const coins = 20 + area.level * 10;
    P.coins += coins;
    sfx.chest();
    const quests = checkAreaNotices(area);
    persist();
    const snap = snapshot(P);
    await showResults({ profile: P, res: { xp: 0, before: snap, after: snap }, title: 'The chest opens!', coins, items: item ? [item] : [], quests, area });
  } else {
    persist();
    await dialog({ who: 'Challenge Chest', text: `The seal held this time (${right} of 3). Practise and come back. The chest will wait!`, read: autoRead(P) });
  }
}

async function guardian(e) {
  const area = areaById(e.areaId);
  const g = e.data;
  if (P.areas[area.id]?.guardian) return;
  if (!guardianAwake(P, area.id)) {
    const done = objectiveProgress(P, area.id).filter((o) => o.done && !o.guardian && !o.side).length;
    await dialog({ who: g.name, portrait: null, text: `The Guardian is sleeping. Complete more quests in ${area.name} to wake it, including beating or befriending the wild pets (${done} of ${guardianWakeCount(area.id)} done). Check 📜 Quests.`, read: autoRead(P) });
    return;
  }
  const ok = await dialog({ who: g.name, text: `${g.name} awakens! This is the final battle of ${REGION_NAMES[area.region]}, and its questions cover all of ${regionLabel(area.region)}. Are you ready?`, choices: [{ label: 'Battle! ✦', value: true, style: 'green' }, { label: 'Not yet', value: false }], read: autoRead(P) });
  if (!ok) return;
  const natives = REGION_SPECIES[area.region].filter((sp) => speciesUnlocked(P, sp, area.region) && SPECIES[sp].cls <= Math.max(2, area.level - 1));
  // Levels [TUNABLE]: set from area 4's lowest wild level: helpers +3, the Guardian +5 (Lv 16 before the strand shift).
  // That keeps it about 2 levels above a team finishing area 4, like the old area 3 Guardian (Lv 14 vs a Lv 12 team,
  // beaten by the test playthrough with 26 of 27 right). Its old rule (top level + 1) would have been Lv 19.
  // v40: two levels up from v39 (helpers +1): the Guardian was won on every first try.
  const low = areaPet(P, area)[0], shift = areaShift(P, area);
  const topStage = Math.max(1, ...teamPets(P).map((p) => p.stage || 1));   // v56: helpers never more evolved than the kid's best pet
  const minions = [0, 1].map(() => { const species = natives[Math.floor(rand() * natives.length)]; return { species, level: low + 4, stage: Math.min(topStage, stageForLevel(species, low + 4)) }; });   // v46: evolved like the team by now (an unevolved Lv 30 helper made one v45 Guardian easy)
  const res = await battle({ kind: 'guardian', area, bossId: `g-${area.id}`, enemies: minions, champion: { type: 'guardian', name: g.name, region: area.region, level: low + 7 } });
  if (res.result === 'win') {
    areaState(P, area.id).guardian = true;
    persist();
    await afterBattle(res, 'guardian', area);
    const left = REGIONS.filter((r) => !P.areas[`${r}-${SUBZONES}`]?.guardian).map((r) => REGION_NAMES[r]);
    await celebrate({ title: `You defeated ${g.name}!`, sub: `${REGION_NAMES[area.region]} is complete! ${left.length ? `Guardians still wait in ${left.join(', ')}.` : 'You beat every Guardian in the land. What a wizard!'}`, button: 'Hooray!' });
    worldScene()?.refreshAll();
  } else await afterBattle(res, 'guardian', area);
}

async function gate(e) {
  if (e.open) return;
  const to = areaById(e.gate.to);
  await dialog({ who: 'Rune Gate', text: `This gate leads to ${to.name}. It opens when ${FEATURES[e.areaId].guardian.name} is defeated.`, read: autoRead(P) });
}

boot();

// Stamina battles: your wizard + up to 3 pets vs up to 3 pets + an optional champion.
// Every fighter has a stamina bar that fills by speed; when full, it acts. Bars pause while a menu or question is open,
// so kids are never rushed. Each of your actions needs a correct answer.
import { h, sleep, mount, toast } from './dom.js';
import { askQuestion } from './question.js';
import { checkStruggle } from './lesson.js';
import { track } from '../core/telemetry.js';
import { creatureSVG, guardianSVG } from '../art/creatures.js';
import { wizardSVG, npcSVG } from '../art/wizard.js';
import { playSpell, playFaint, playCatch, shake } from '../art/fx.js';
import { DOT_STYLE } from '../content/abilities.js';
import { SPECIES, elementMultiplier, effectLabel, petStats, speciesName, stageForLevel, ELEMENTS, CLASSES, befriendThreshold } from '../content/species.js';
import { makeQuestion, skillsForSpecies, skillsForStrand, skillsFor } from '../content/curriculum.js';
import { MAX_MAGIC, wizardAbilitiesFor, petAbilitiesFor, trainerAbilities, guardianAbilities } from '../content/abilities.js';
import { equippedBonus } from '../content/items.js';
import { recordAnswer } from '../core/adaptive.js';
import { mulberry32, newSeed } from '../core/rng.js';
import { sfx } from '../core/sfx.js';
import { speak } from '../core/speech.js';
import { persist } from '../core/save.js';
import { teamPets, fullStats, giveXP, giveWizardXP, autoRead, newPet, addPet, enemyScale, canBefriendStage } from '../game/progress.js';
import { tip } from './tutorial.js';

let battlefieldSVG = null;
import('../art/battlefield.js').then((m) => { battlefieldSVG = m.battlefieldSVG; }).catch(() => {});

const REGION_ELEMENT = { number: 'star', patterns: 'vine', shape: 'stone', stats: 'storm' };
const STAMINA_RATE = 4.2;           // stamina per second per point of speed (speed 10 fills in ~2.4 s)

// Feet positions in battlefield-art coordinates (viewBox 1600×900, drawn with "xMidYMax slice").
// Allies stand on the left pad, enemies on the right pad (a little farther away).
const ALLY_SLOTS = { wizard: [120, 735], pets: [[470, 718], [285, 885], [300, 545]] };
const ENEMY_SLOTS = { champion: [1480, 735], pets: [[1130, 718], [1315, 885], [1300, 545]] };
const ENEMY_SLOTS_NO_CHAMP = [[1130, 718], [1315, 885], [1300, 545]];

export function runBattle(opts) {
  return new Promise((resolve) => new Battle(opts, resolve).start());
}

class Battle {
  constructor(opts, resolve) {
    this.o = opts;
    this.p = opts.profile;
    this.resolve = resolve;
    this.rand = mulberry32(newSeed());
    this.gentle = this.p.grade <= 2;
    this.magic = Math.min(MAX_MAGIC, 1 + Math.floor(equippedBonus(this.p).focus || 0));
    this.log = { t0: Date.now(), turns: 0, playerTurns: 0, questions: 0, correct: 0, second: 0 };
    this.hints = 0; this.xpTotal = 0; this.levelEvents = []; this.tierUps = []; this.caughtList = [];
    this.paused = true; this.over = false;
    this.before = snapshot(this.p);
    this.units = [];
    window.__mwaBattle = this;   // test hook (used by tools/test-befriend.mjs)
  }

  // ---------- setup ----------
  start() {
    const P = this.p;
    const eq = equippedBonus(P);
    const W = P.wizard.level;
    this.units.push(unit({
      side: 'ally', kind: 'wizard', name: P.name, level: W, element: 'arcane',
      maxHp: Math.round(40 + W * 8 + (eq.vitality || 0)), power: 8 + W * 2.5 + (eq.power || 0), ward: 3 + W * 1.2 + (eq.ward || 0),
      speed: 10.5, abilities: wizardAbilitiesFor(W), look: P.look,
    }));
    for (const pet of teamPets(P).filter((x) => x.hp > 0).slice(0, 3)) {
      const st = fullStats(P, pet);
      const sp = SPECIES[pet.species];
      this.units.push(unit({
        side: 'ally', kind: 'pet', pet, name: speciesName(pet), level: pet.level, species: pet.species, stage: pet.stage, rare: pet.rare,
        element: sp.element, family: sp.family, maxHp: st.maxHp, hp: pet.hp, power: st.power, ward: st.ward,
        speed: st.speed, abilities: battleSet(petAbilitiesFor(sp, pet.stage, pet.level)),
      }));
    }
    // Enemies absorb part of the team's extra strength (evolutions, rare pets, merges, gear) so battles stay a challenge.
    const es = enemyScale(this.p, this.o.area);
    this.enemyScale = es;
    // Pets in a group each have a bit less health, so a 3-pet battle doesn't take three times as long [TUNABLE].
    const groupHp = this.o.kind === 'wild' || this.o.kind === 'blocker' ? GROUP_HP[Math.min(3, this.o.enemies.length)] : 1;
    // Wild pets hit a bit harder [TUNABLE]: they were no threat at all (teams finished wild battles with ~90% health).
    const wildPow = this.o.kind === 'wild' ? WILD_POWER[this.o.area?.level] ?? WILD_POWER[4] : 1;
    for (const e of this.o.enemies) { const u = enemyPet(e, es, groupHp); u.power *= wildPow; this.units.push(u); }
    const ch = this.o.champion;
    if (ch?.type === 'trainer') {
      this.units.push(unit({ side: 'enemy', kind: 'champion', champ: 'trainer', name: ch.name, npc: ch.kind, level: ch.level, element: 'arcane',
        maxHp: Math.round((30 + ch.level * 7) * champScale(ch.level) * es), power: (7 + ch.level * 2.2) * champScale(ch.level) * es, ward: 3 + ch.level, speed: 10, abilities: trainerAbilities(ch.level) }));
    } else if (ch?.type === 'guardian') {
      const el = REGION_ELEMENT[ch.region];
      // A Mini Guardian (the mid-game milestone at the door to area 3) has less health and hits a little softer [TUNABLE].
      const [hpK, powK] = ch.mini ? MINI_GUARDIAN : [1, 1];
      this.units.push(unit({ side: 'enemy', kind: 'champion', champ: 'guardian', mini: !!ch.mini, name: ch.name, region: ch.region, level: ch.level, element: el,
        maxHp: Math.round((40 + ch.level * 12) * 1.5 * hpK * (ch.mini ? 1 : GUARDIAN_HP) * champScale(ch.level) * es), power: (8 + ch.level * 2.3) * powK * (ch.mini ? 1 : GUARDIAN_POW) * champScale(ch.level) * es, ward: 4 + ch.level * 1.1, speed: 9, abilities: guardianAbilities(el) }));
    }
    // A tired boss (see battle() in main.js): its side starts with less health after earlier losses.
    if (this.o.ease && this.o.ease < 1) for (const u of this.units) if (u.side === 'enemy') { u.maxHp = Math.round(u.maxHp * this.o.ease); u.hp = u.maxHp; }
    for (const u of this.units) u.stamina = 10 + this.rand() * 45 + (u.side === 'ally' ? 15 : 0);
    if (!this.units.some((u) => u.side === 'ally' && u.kind === 'pet')) { this.finish('lose'); return; }

    this.render();
    const foes = this.enemies().filter((e) => e.kind === 'pet');
    const n = foes.length;
    const intro = {
      wild: n > 1 ? `A group of ${n} wild pets appeared!` : `A wild ${foes[0]?.name} appeared!`,
      blocker: n > 1 ? `${n} wild pets block the path!` : `A wild ${foes[0]?.name} blocks the path!`,
      challenge: `★ A rare ${foes[0]?.name} challenges you! Harder questions ahead.`,
      trainer: `${ch?.name} wants to battle!`,
      guardian: `${ch?.name} awakens!`,
    }[this.o.kind] || 'Battle!';
    sfx.encounter();
    this.say(this.o.tired ? `${intro} They look tired from last time!` : intro, true);
    setTimeout(async () => {
      const P = this.p;
      await tip(P, 'battle');
      await tip(P, 'elements');
      if (this.units.some((u) => u.leader)) await tip(P, 'leader');
      if (this.units.some((u) => u.kind === 'champion')) await tip(P, 'champion');
      this.paused = false; this.last = performance.now(); this.loop();
    }, 1200);
  }

  allies() { return this.units.filter((u) => u.side === 'ally' && u.alive); }
  enemies() { return this.units.filter((u) => u.side === 'enemy' && u.alive); }
  foesOf(u) { return u.side === 'ally' ? this.enemies() : this.allies(); }
  friendsOf(u) { return u.side === 'ally' ? this.allies() : this.enemies(); }

  // ---------- rendering ----------
  render() {
    const theme = this.o.area?.theme || 'academy';
    this.bg = h('div.bf-bg.battle-bg.' + theme);
    const setBg = () => {
      if (!battlefieldSVG) return;
      try { this.bg.innerHTML = battlefieldSVG(theme, { guardian: this.o.kind === 'guardian', variant: (this.o.area?.level || 1) >= 3 ? 1 : 0 }); } catch (e) { /* keep gradient */ }
    };
    setBg();
    if (!battlefieldSVG) setTimeout(setBg, 500);
    this.field = h('div.bf-field', this.bg);
    this.msg = h('div.bf-msg');
    this.actions = h('div.bf-actions');
    this.magicEl = h('div.bf-magic');
    this.el = h('div.battle.bf',
      this.o.kind === 'challenge' ? h('div.challenge-tag', '★ CHALLENGE BATTLE') : null,
      this.field,
      h('div.bf-panel', h('div.bf-top', this.msg, this.magicEl), this.actions));
    mount(this.el);
    for (const u of this.units) this.field.appendChild(this.unitEl(u));
    this.layout();
    this.onResize = () => this.layout();
    window.addEventListener('resize', this.onResize);
    // The ability panel changes height between turns, so re-place fighters whenever the field size changes.
    if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(this.field); }
    this.drawMagic();
  }

  unitEl(u) {
    let art;
    if (u.kind === 'wizard') art = wizardSVG(u.look, { facing: 'right', pose: 'cast' });
    else if (u.champ === 'trainer') art = npcSVG(u.npc, { facing: 'left', pose: 'cast' });
    else if (u.champ === 'guardian') art = guardianSVG(u.region, { facing: 'left' });
    else art = creatureSVG(u.species, u.stage, { variant: u.rare ? 'rare' : 'normal', facing: u.side === 'ally' ? 'right' : 'left' });
    u.artNormal = art;
    u.sprite = h('div.u-sprite.idle', { html: art, style: { animationDelay: `-${(this.rand() * 2).toFixed(2)}s` } });
    u.hpBar = h('i'); u.stBar = h('i'); u.statusEl = h('div.u-status');
    // A small 🤝 tick on a wild pet's health bar shows where its befriend zone starts.
    const befriendMark = u.side === 'enemy' && u.kind === 'pet' && !u.leader && this.canBefriendHere()
      ? h('span.u-friend-mark', { style: { left: `${Math.round(befriendThreshold(u.species, u.rare) * 100)}%` }, title: 'Befriend zone' }) : null;
    u.plate = h('div.u-plate',
      h('div.u-name', h('span', (u.kind === 'wizard' ? '🧙 ' : u.leader ? '👑 ' : u.kind === 'champion' ? '⭐ ' : ELEMENTS[u.element] ? ELEMENTS[u.element].icon + ' ' : '') + u.name + (u.pet?.rank > 1 ? ' ' + '★'.repeat(u.pet.rank) : '')), h('b', `Lv ${u.level}`)),
      h('div.u-hp', u.hpBar, befriendMark), h('div.u-st', u.stBar), u.statusEl);
    u.friendBadge = u.side === 'enemy' && u.kind === 'pet'
      ? h('button.befriend-badge', { hidden: true, 'aria-label': `Befriend ${u.name}`, onclick: (e) => { e.stopPropagation(); this.onBefriendTap(u); } }, '🤝 Befriend')
      : null;
    u.el = h('div.unit.' + u.side + (u.kind === 'champion' ? '.champ' : ''), { onclick: () => this.onUnitTap(u) }, u.plate, u.sprite, h('div.u-shadow'), u.friendBadge);
    this.updateUnit(u);
    return u.el;
  }

  layout() {
    const r = this.field.getBoundingClientRect();
    const fw = r.width, fh = r.height;
    // Same transform as the backdrop's preserveAspectRatio="xMidYMax slice", so feet land on the painted pads.
    const k = Math.max(fw / 1600, fh / 900);
    const ox = (fw - 1600 * k) / 2, oy = fh - 900 * k;
    // The backdrop's sides get cropped on narrower screens: squeeze the formation into the visible width.
    const visX0 = -ox / k, visX1 = (fw - ox) / k;
    const MIN_X = 110, MAX_X = 1490, pad = 60;
    const lo = Math.max(MIN_X, visX0 + pad), hi = Math.min(MAX_X, visX1 - pad);
    const mapX = (x) => lo + ((x - MIN_X) / (MAX_X - MIN_X)) * (hi - lo);
    const portrait = fw / Math.max(1, fh) < 1.15;
    const toPx = ([x, y]) => [ox + mapX(x) * k, oy + y * k];
    const U = portrait ? Math.min(fw * 0.2, fh * 0.2) : 190 * k;
    const place = (u, pt, far) => {
      let size;
      const isHuman = u.kind === 'wizard' || u.champ === 'trainer';
      if (isHuman) size = U * 1.05;
      else if (u.champ === 'guardian') size = U * (u.mini ? 1.45 : 1.85);
      else size = U * (0.84 + 0.17 * (u.stage - 1)) * (u.leader ? 1.28 : 1);
      size *= 0.86 + 0.22 * Math.max(0, Math.min(1, (pt[1] - 540) / 345));   // farther up = a bit smaller
      const [px, py] = toPx(pt);
      u.sprite.style.width = (isHuman ? size * 0.75 : size) + 'px';
      u.sprite.style.height = size + 'px';
      u.el.style.left = px + 'px';
      u.el.style.top = py + 'px';
      u.el.style.zIndex = String(Math.round(pt[1]));
    };
    const allyPets = this.units.filter((u) => u.side === 'ally' && u.kind === 'pet');
    const enemyPets = this.units.filter((u) => u.side === 'enemy' && u.kind === 'pet');
    const wiz = this.units.find((u) => u.kind === 'wizard');
    const champ = this.units.find((u) => u.kind === 'champion');
    place(wiz, ALLY_SLOTS.wizard, false);
    allyPets.forEach((u, i) => place(u, ALLY_SLOTS.pets[i], false));
    if (champ) place(champ, ENEMY_SLOTS.champion, true);
    const eslots = champ ? ENEMY_SLOTS.pets : ENEMY_SLOTS_NO_CHAMP;
    enemyPets.forEach((u, i) => place(u, eslots[i], true));
    requestAnimationFrame(() => this.unstackPlates());
  }

  /** Nudge name plates up so none overlap (front fighters keep their spot; ones behind move). */
  unstackPlates() {
    const units = this.units.filter((u) => u.plate);
    units.forEach((u) => { u.plate.style.transform = ''; });
    const placed = [];
    const vw = window.innerWidth;
    for (const u of [...units].sort((a, b) => parseFloat(b.el.style.top) - parseFloat(a.el.style.top))) {
      let r = u.plate.getBoundingClientRect();
      // Keep the plate on screen (a champion stands near the right edge and has a long name).
      const dx = r.right > vw - 6 ? vw - 6 - r.right : r.left < 6 ? 6 - r.left : 0;
      if (dx) r = { left: r.left + dx, right: r.right + dx, top: r.top, bottom: r.bottom };
      let shift = 0;
      for (let guard = 0; guard < 8; guard++) {
        const hit = placed.find((p) => r.left < p.right - 2 && r.right > p.left + 2 && r.top - shift < p.bottom + 2 && r.bottom - shift > p.top - 2);
        if (!hit) break;
        shift += (r.bottom - shift) - hit.top + 4;
      }
      if (shift || dx) u.plate.style.transform = `translate(${dx}px, ${-shift}px)`;
      placed.push({ left: r.left, right: r.right, top: r.top - shift, bottom: r.bottom - shift });
    }
  }

  updateUnit(u) {
    const pct = Math.max(0, (u.hp / u.maxHp) * 100);
    u.hpBar.style.width = pct + '%';
    u.hpBar.className = pct < 30 ? 'low' : '';
    u.stBar.style.width = Math.min(100, u.stamina) + '%';
    const s = u.status, icons = [];
    if (s.freeze) icons.push(`❄️${s.freeze}`);
    if (s.stun) icons.push(`💫${s.stun}`);
    if (s.slow) icons.push('🐢');
    if (s.haste) icons.push('⏩');
    if (s.shield > 0) icons.push('🛡️');
    if (s.empower) icons.push('💪');
    if (s.armor) icons.push('🪨');
    if (s.weaken) icons.push('💧');
    if (s.taunt) icons.push('🎯');
    if (s.rally) icons.push('🔥');
    if (s.dot) icons.push(s.dot.icon + s.dot.turns);
    if (s.regen) icons.push('🌱' + s.regen.turns);
    u.statusEl.textContent = icons.join(' ');
    if (u.friendBadge) {
      // In the befriend zone: 🤝 badge, or 🔒 if it's an evolved pet you can't befriend yet.
      const show = u.alive && this.canBefriendHere() && this.inFriendZone(u);
      const locked = show && this.befriendLocked(u);
      if (show && !locked && u.friendBadge.hidden) this.pendingBefriendTip = true;
      u.friendBadge.hidden = !show;
      u.friendBadge.classList.toggle('locked', locked);
      u.friendBadge.textContent = locked ? '🔒 Befriend' : '🤝 Befriend';
    }
  }

  canBefriendHere() { return (this.o.kind === 'wild' || this.o.kind === 'blocker') && !this.over; }

  /** Tapping the 🤝 under a tired wild pet: works on any of your team's turns, or between turns. */
  async onBefriendTap(t) {
    if (t.alive && this.inFriendZone(t) && this.befriendLocked(t)) {
      const base = SPECIES[t.species].names[t.stage - 2];
      this.say(`🔒 ${t.name} only trusts wizards who already have a ${t.name}. Evolve your own ${base} first!`, true);
      tip(this.p, 'evolvedWild');
      return;
    }
    if (!this.befriendable(t) || !t.alive || this.befriending) return;
    const B = { id: 'befriend', name: 'Befriend', icon: '🤝', cost: 0, kind: 'befriend', target: 'enemy' };
    if (this.turnDone) {
      // It's one of your fighters' turns: befriending uses that turn.
      this.clearTargeting();
      this.befriending = true;
      await this.perform(this.actingUnit, B, t);
      this.befriending = false;
      return;
    }
    if (this.paused) { toast('Wait for your turn, then tap 🤝 again!'); return; }
    // Between turns: pause the stamina bars, try right away, then carry on.
    this.paused = true;
    this.befriending = true;
    const u = this.allies()[0];
    await this.perform(u, B, t);
    this.befriending = false;
    if (this.checkEnd()) return;
    this.actions.replaceChildren();
    this.last = performance.now();
    this.paused = false;
  }

  drawMagic() {
    this.magicEl.replaceChildren(h('span', 'Magic '), ...Array.from({ length: MAX_MAGIC }, (_, i) => h('span.orb' + (i < this.magic ? '.on' : ''))));
  }

  say(text, read = false) {
    this.msg.textContent = text;
    if (read && autoRead(this.p)) speak(text);
  }

  // ---------- stamina loop ----------
  loop() {
    if (this.over) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.paused) {
      for (const u of this.units) {
        if (!u.alive) continue;
        const rate = u.speed * STAMINA_RATE * (u.status.haste ? 1.5 : 1) * (u.status.slow ? 0.6 : 1);
        u.stamina = Math.min(100, u.stamina + rate * dt);
        u.stBar.style.width = u.stamina + '%';
      }
      if (this.checkEnd()) return;   // safety net: a side with nobody left ends the battle before anyone acts
      const ready = this.units.filter((u) => u.alive && u.stamina >= 100).sort((a, b) => (a.side === 'ally' ? 0 : 1) - (b.side === 'ally' ? 0 : 1));
      if (ready.length) { this.paused = true; this.turn(ready[0]); }
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }

  async turn(u) {
    if (this.checkEnd()) return;
    this.log.turns++; if (u.side === 'ally') this.log.playerTurns++;
    u.stamina = 0;
    u.el.classList.add('acting');
    for (const k of ['haste', 'slow', 'armor', 'weaken', 'rally']) if (u.status[k]) u.status[k]--;
    if (u.status.taunt && !--u.status.taunt) this.endTaunt(u);
    if (await this.tickOverTime(u)) { u.el.classList.remove('acting'); if (this.checkEnd()) return; this.last = performance.now(); this.paused = false; return; }
    if (u.status.freeze || u.status.stun) {
      // A full stamina bar is spent shaking off freeze/stun instead of acting.
      const k = u.status.freeze ? 'freeze' : 'stun';
      u.status[k]--;
      this.float(u, k === 'freeze' ? '❄️ Frozen!' : '💫 Stunned!', 'eff');
      this.say(`${u.name} is ${k === 'freeze' ? 'frozen' : 'stunned'} and can't move!`);
      this.updateUnit(u);
      await sleep(900);
    } else if (u.side === 'ally') {
      await this.playerTurn(u);
    } else {
      await this.enemyTurn(u);
    }
    u.el.classList.remove('acting');
    this.updateUnit(u);
    if (this.checkEnd()) return;
    if (this.pendingStatusTip) { this.pendingStatusTip = false; await tip(this.p, 'status'); }
    if (this.pendingBefriendTip) { this.pendingBefriendTip = false; await tip(this.p, 'befriend'); }
    if (this.pendingOvertimeTip) { this.pendingOvertimeTip = false; await tip(this.p, 'overtime'); }
    this.actions.replaceChildren();
    this.say('');
    this.last = performance.now();
    this.paused = false;
  }

  /** Start-of-turn effects: lingering damage (Sting) and healing (Regrowth). Returns true if the unit fainted. */
  async tickOverTime(u) {
    const s = u.status;
    if (s.regen) {
      const amt = Math.round(u.maxHp * s.regen.amount);
      u.hp = Math.min(u.maxHp, u.hp + amt); if (u.pet) u.pet.hp = u.hp;
      this.float(u, `🌱 +${amt}`, 'heal');
      if (!--s.regen.turns) s.regen = null;
      this.updateUnit(u);
    }
    if (s.dot) {
      const d = s.dot;
      u.hp = Math.max(0, u.hp - d.dmg); if (u.pet) u.pet.hp = u.hp;
      this.float(u, `${d.icon} −${d.dmg}`);
      this.hurtFlash(u);
      if (!--d.turns) s.dot = null;
      this.updateUnit(u);
      if (u.hp <= 0) { await sleep(500); await this.handleFaints(); return true; }
      await sleep(350);
    }
    return false;
  }

  /** The tank's Challenge Roar ends (it got hit or ran out of turns): its teammates lose the rally boost. */
  endTaunt(t) {
    t.status.taunt = 0;
    for (const f of this.units) if (f.side === t.side && f.status.rallyBy === t) { f.status.rally = 0; f.status.rallyBy = null; this.updateUnit(f); }
    this.updateUnit(t);
  }

  /** Enemies of u that are taunting (single-target attacks must pick one of them). */
  taunters(u) { return this.foesOf(u).filter((x) => x.status.taunt); }

  checkEnd() {
    if (this.over) return true;
    if (!this.enemies().length) { this.finish('win'); return true; }
    if (!this.allies().length) { this.finish('lose'); return true; }
    return false;
  }

  // ---------- player turns ----------
  playerTurn(u) {
    return new Promise(async (done) => {
      this.turnDone = done;
      this.actingUnit = u;
      this.showAbilities(u);
      await tip(this.p, 'abilities');
      if (u.abilities.some((a) => a.cost > 0) && this.magic >= 2) await tip(this.p, 'magic');
      if (this.canBefriendHere() && this.enemies().some((e) => this.befriendable(e))) await tip(this.p, 'befriend');
    });
  }

  showAbilities(u) {
    this.clearTargeting();
    this.say(`${u.name}'s turn! Choose an ability.`);
    const btns = u.abilities.filter((a) => a.kind !== 'befriend').map((a) => {
      const eligible = a.kind !== 'befriend' || this.enemies().some((e) => this.befriendable(e));
      const cls = a.cost >= 4 ? '.green' : a.cost >= 2 ? '.purple' : a.cost >= 1 ? '' : '.secondary';
      const short = Math.max(0, a.cost - this.magic);
      return h('button.btn.ab-btn' + cls, { disabled: short > 0 || !eligible, onclick: () => this.pickAbility(u, a) },
        h('span.ab-name', `${a.icon} ${a.name}`),
        h('span.cost', a.cost ? h('span.cost-orbs', ...Array.from({ length: a.cost }, (_, i) => h('i' + (i < this.magic ? '.have' : '')))) : h('span.free', 'Free')),
        h('span.ab-eff', this.effectText(u, a)),
        h('span.ab-desc', a.desc || ''));
    });
    if (['wild', 'challenge', 'blocker'].includes(this.o.kind)) {
      btns.push(h('button.btn.secondary.ab-btn', { onclick: () => { this.turnDone(); this.finish('run'); } }, h('span.ab-name', '🏃 Leave'), h('span.cost', 'No penalty')));
    }
    this.actions.replaceChildren(...btns);
  }

  /** What a move does, in numbers: damage range (before the target's defence and elements), heal, shield, etc. */
  effectText(u, a) {
    const pct = (x) => `${Math.round(x * 100)}%`;
    if (a.kind === 'attack') {
      const base = u.power * (a.mult || 1) * (u.status.empower ? 2 : 1);
      const r = `${Math.max(1, Math.round(base * 0.9))}–${Math.max(1, Math.round(base * 1.1))}`;
      let t = `💥 ${r}`;
      if (a.target === 'randomEnemies') t += ` × ${a.hits} random`;
      else if (a.hits > 1) t += ` × ${a.hits}`;
      if (a.target === 'allEnemies') t += ' to all';
      if (a.splash) t += ` + ${pct(a.splash)} splash`;
      if (a.status?.freeze) t += ' · ❄️';
      if (a.status?.stun) t += ` · 💫${a.statusChance ? pct(a.statusChance) : ''}`;
      if (a.status?.slow) t += ' · 🐢';
      if (a.dot) { const [, icon] = DOT_STYLE[a.fx?.element || u.element] || DOT_STYLE.arcane; t += ` · ${icon} ${Math.max(1, Math.round(u.power * a.dot.mult))} × ${a.dot.turns} turns`; }
      if (a.drain) t += ` · 💚 heals ${pct(a.drain)} of it`;
      return t;
    }
    if (a.kind === 'taunt') return `🎯 enemies must hit it · team +${pct(a.rally || 0.3)} damage`;
    if (a.kind === 'regen') return `🌱 +${pct(a.amount)} health × ${a.turns || 3} turns${a.target === 'allAllies' ? ' to all' : ''}`;
    if (a.kind === 'heal') return `💚 +${pct(a.amount)} health${a.target === 'allAllies' ? ' to all' : ''}`;
    if (a.kind === 'shield') return `🛡️ ${pct(a.amount)} shield${a.target === 'allAllies' ? ' to all' : ''}`;
    if (a.kind === 'buff') return a.status?.empower ? '💪 next hit × 2' : a.status?.armor ? `🪨 −35% damage taken (${a.status.armor} turns)` : 'boost';
    if (a.kind === 'debuff') return a.status?.weaken ? `💧 −30% damage dealt (${a.status.weaken} turns)` : a.status?.stun ? '💫 lose a turn' : 'weaken';
    if (a.kind === 'stamina') return a.stamina > 0 ? `⏩ +${a.stamina}% stamina${a.target === 'allAllies' ? ' to all' : ''}` : `🐢 −${-a.stamina}% stamina${a.target === 'allEnemies' ? ' to all' : ''}`;
    return '';
  }

  /** Tired enough to befriend (the 🤝 badge shows). Evolved pets also need your own pet of that kind at that stage. */
  inFriendZone(e) { return e.kind === 'pet' && !e.leader && e.hp / e.maxHp <= befriendThreshold(e.species, e.rare); }
  befriendLocked(e) { return !canBefriendStage(this.p, e.species, e.stage); }
  befriendable(e) { return this.inFriendZone(e) && !this.befriendLocked(e); }

  pickAbility(u, a) {
    sfx.tap();
    if (a.target === 'allEnemies' || a.target === 'randomEnemies' || a.target === 'allAllies' || a.target === 'self') { this.perform(u, a, null); return; }
    let pool = a.target === 'ally' ? this.allies() : this.enemies().filter((e) => a.kind !== 'befriend' || this.befriendable(e));
    if (a.target !== 'ally' && a.kind !== 'befriend' && this.taunters(u).length) { pool = this.taunters(u); this.say(`🎯 ${pool[0].name} is roaring! You have to hit it first.`); tip(this.p, 'taunt'); }
    // Nobody left to target (the last enemy just fainted or was befriended): end the turn, and the battle if it's won.
    // A test bot once sat on "Tap an enemy" with no enemy left.
    if (!pool.length) {
      this.clearTargeting();
      if (!this.checkEnd()) { this.showAbilities(u); return; }
      const done = this.turnDone; this.turnDone = null; this.actingUnit = null; done?.();
      return;
    }
    if (pool.length === 1) { this.perform(u, a, pool[0]); return; }
    this.targeting = { u, a, pool };
    pool.forEach((t) => {
      t.el.classList.add('targetable');
      if (a.kind === 'attack' && t.side === 'enemy') {
        const el = a.fx?.element || u.element;
        const lab = effectLabel(elementMultiplier(el, t.element, t.species));
        if (lab.cls !== 'normal') t.el.appendChild(h('div.eff-tag.' + lab.cls, lab.text));
      }
    });
    this.say(a.target === 'ally' ? `Tap a teammate for ${a.name}.` : `Tap an enemy to target with ${a.name}.`);
    this.actions.replaceChildren(h('button.btn.secondary', { onclick: () => this.showAbilities(u) }, '← Back'));
    tip(this.p, 'target');
  }

  onUnitTap(t) {
    if (!this.targeting || !this.targeting.pool.includes(t)) return;
    const { u, a } = this.targeting;
    this.clearTargeting();
    this.perform(u, a, t);
  }

  clearTargeting() {
    this.targeting = null;
    this.units.forEach((x) => { x.el.classList.remove('targetable'); x.el.querySelectorAll('.eff-tag').forEach((n) => n.remove()); });
  }

  questionCandidates(target) {
    const area = this.o.area;
    if (this.o.kind === 'guardian' && area) return skillsForStrand(this.p, area.region);
    if (target && target.side === 'enemy' && target.species && this.rand() < 0.7) return skillsForSpecies(this.p, target.species, SPECIES[target.species]);
    const foe = this.enemies().find((e) => e.species);
    if (foe && this.rand() < 0.5) return skillsForSpecies(this.p, foe.species, SPECIES[foe.species]);
    return skillsFor(this.p);
  }

  async ask(target, sameSkillId = null, qopts = {}) {
    this.actions.replaceChildren();
    const opts = { candidates: this.questionCandidates(target), mode: this.o.kind === 'challenge' ? 'challenge' : 'normal', areaMinTier: this.o.area?.minTier || 1 };
    if (sameSkillId) opts.skillId = sameSkillId;
    const qi = makeQuestion(this.p, opts);
    const res = await askQuestion(qi, { autoRead: autoRead(this.p), profile: this.p, ...qopts });
    if (res.hinted) this.hints++;
    const r = recordAnswer(this.p, qi.skill.id, res.correct, { mode: qi.mode, tier: qi.tier, hinted: res.hinted });
    if (r.tierChange > 0) { this.tierUps.push(qi.skill.name); toast(`⬆ Skill up! ${qi.skill.name}`); sfx.levelUp(); await tip(this.p, 'skillUp'); }
    if (r.mastered) toast(`★ Mastered: ${qi.skill.name}!`);
    if (!res.correct || res.secondTry) checkStruggle(this.p, qi.skill.id);
    persist();
    return { ...res, skillId: qi.skill.id };
  }

  async perform(u, a, target) {
    this.magic -= a.cost; this.drawMagic();
    this.say(a.kind === 'befriend' ? `Answer to befriend ${target.name}!` : `Answer to cast ${a.name}!`);
    // A wrong answer reveals the hint and allows one more try at the same question; a right second try casts
    // at half strength. (Befriending has no half version, so it doesn't get a second try.)
    const res = await this.ask(target, null, a.kind === 'befriend' ? {} : { retry: true, retryNote: `A right answer now casts ${a.name} at half strength.` });
    const power = res.correct && res.secondTry ? SECOND_TRY : 1;
    this.log.questions++; if (res.correct) this.log.correct++; if (res.secondTry) this.log.second++;
    if (res.correct) {
      if (power === 1) { this.magic = Math.min(MAX_MAGIC, this.magic + 1); this.drawMagic(); }
      const foeLevel = Math.max(1, ...this.units.filter((x) => x.side === 'enemy').map((x) => x.level));
      const xp = Math.round((3 + Math.round(foeLevel * 0.6)) * power);
      this.xpTotal += xp;
      if (u.kind === 'pet') this.levelEvents.push(...giveXP(this.p, u.pet, xp));
      giveWizardXP(this.p, u.kind === 'wizard' ? 3 : 1);
      if (a.kind === 'befriend') await this.befriend(u, target);
      else {
        if (power < 1) { this.float(u, '½ power', 'eff'); this.say(`${a.name} at half strength!`); }
        await this.execute(u, power < 1 ? scaleAbility(a, power) : a, target);
      }
    } else {
      this.magic = Math.min(MAX_MAGIC, this.magic + a.cost); this.drawMagic();
      if (a.kind === 'befriend' && target?.alive) {
        target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * 0.08));
        this.float(target, 'Not sure yet…', 'eff');
        this.updateUnit(target);
      }
      this.say(a.kind === 'befriend' ? `${target?.name} isn’t sure yet. Try again!` : this.gentle ? 'Nice try! Let’s keep going.' : `${a.name} missed!`);
      sfx.wrong();
      await sleep(800);
    }
    const done = this.turnDone; this.turnDone = null; this.actingUnit = null; done?.();
  }

  // ---------- enemy turns ----------
  // ---------- enemy tactics ----------
  // How often an enemy makes the clever choice instead of a plain one [TUNABLE]: wild pets are the least clever (a bit
  // sharper deeper in a region), Challenges, trainers and the Mini Guardian sharper, the final Guardian best. Nobody
  // plays perfectly, so kids still get openings.
  smarts() {
    const depth = this.o.area?.level || 1;
    const test = typeof window !== 'undefined' && window.__mwaSmarts?.[this.o.kind];   // balance tests only
    if (test != null) return test;
    // v39's lower values left four test bots winning 98–100% of trainer, Challenge and Guardian fights, so enemies now
    // play at their cleverest (the parent's targets: trainers 70–75%, Challenges and Mini Guardian 60–70%, Guardian
    // 40–50%, wild about 90% of first tries).
    if (this.o.kind === 'guardian') return this.o.champion?.mini ? 0.85 : 1;
    // Deep wild pets capped at 0.8: groups of three at 0.9 in area 4 wiped teams answering nearly everything right.
    return { wild: Math.min(0.8, 0.5 + 0.1 * depth), blocker: 0.9, challenge: 0.9, trainer: 0.8 }[this.o.kind] ?? 0.6;
  }
  smart() { return this.rand() < this.smarts(); }
  /** Rough damage of ability a from u on t (the real roll varies ±10%). */
  estDamage(u, a, t) {
    const eff = elementMultiplier(a.fx?.element || u.element, t.element, t.species);
    let d = u.power * (a.mult || 1) * (a.hits || 1) * eff * (u.status.empower ? 2 : 1) * (u.status.weaken ? 0.7 : 1);
    if (!a.pierce) d -= t.ward * 0.45 * (a.hits || 1);
    if (t.status.armor && !a.pierce) d *= 0.65;
    return Math.max(1, d - (t.status.shield > 0 && !a.pierce ? t.status.shield : 0));
  }
  /** Best single target for an attack: finish off anyone it can knock out, then hit hardest where it counts most
   *  (its element beats them, they're hurt, they hit hard). */
  bestTarget(u, a, foes) {
    const score = (t) => {
      const d = this.estDamage(u, a, t);
      const threat = 1 + (t.power || 0) / 60;
      return (d >= t.hp ? 1.5 : 0) + (d / t.maxHp) * 2 * threat + 0.5 * (1 - t.hp / t.maxHp);
    };
    // The best target about two times in three, otherwise the next best [TUNABLE]: always piling onto the weakest pet
    // knocked fragile teams out one by one (test bots lost while answering every question right).
    const ranked = [...foes].sort((x, y) => score(y) - score(x));
    return ranked.length > 1 && this.rand() < 0.35 ? ranked[1] : ranked[0];
  }
  /** Total expected damage of an attack this turn (moves that hit everyone count every target). */
  attackValue(u, a, foes, target) {
    const many = a.target === 'allEnemies' || a.target === 'randomEnemies';
    const hitList = many ? foes : [target];
    let v = hitList.reduce((s, t) => s + Math.min(t.hp, this.estDamage(u, a, t)), 0);
    if (a.status && hitList.some((t) => !Object.keys(a.status).some((k) => t.status[k]))) v *= 1 + 0.4 * (a.statusChance ?? 1);
    if (a.selfStamina) v *= 1 + a.selfStamina / 200;
    return v;
  }
  /** Clever support move, if one is worth it: heal a teammate in trouble, shield or armour one that's under fire. */
  smartSupport(u, friends, healCap) {
    const hurt = [...friends].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    const heal = u.abilities.find((x) => x.kind === 'heal');
    if (heal && hurt && hurt.hp / hurt.maxHp < 0.45 && (u.healsUsed || 0) < healCap) {
      u.healsUsed = (u.healsUsed || 0) + 1;
      return [heal, heal.target === 'self' ? u : heal.target === 'allAllies' ? u : hurt];
    }
    const guard = u.abilities.find((x) => x.kind === 'shield' || (x.kind === 'buff' && x.status?.armor));
    if (guard && hurt && hurt.hp / hurt.maxHp < 0.6 && !hurt.status.armor && !(hurt.status.shield > 0) && this.rand() < 0.5) {
      const t = guard.target === 'self' ? u : hurt;
      if (guard.target !== 'self' || hurt === u) return [guard, t];
    }
    return null;
  }

  async enemyTurn(u) {
    const foes = this.allies();
    if (!foes.length) return;
    let a;
    const friends = this.enemies();
    const forced = this.taunters(u);
    const act = async (ab, t) => { this.say(`${u.name} uses ${ab.name}!`); await sleep(350); return this.execute(u, ab, t); };
    const cap = u.champ === 'trainer' ? ENEMY_HEALS.trainer : u.champ === 'guardian' ? ENEMY_HEALS[u.mini ? 'mini' : 'guardian'] : ENEMY_HEALS.wild;
    const clever = this.smart();
    if (u.champ === 'guardian') {
      u.turns = (u.turns || 0) + 1;
      const renew = u.abilities.find((x) => x.kind === 'heal');
      if (u.hp / u.maxHp < renew.lowHp && (u.healsUsed || 0) < cap && this.rand() < 0.35) { u.healsUsed = (u.healsUsed || 0) + 1; return act(renew, u); }
      a = u.turns % 3 === 0 ? u.abilities.find((x) => x.every) : u.abilities[0];
    } else if (clever) {
      // Clever: a support move when a teammate needs it, otherwise the attack that does the most this turn.
      const sup = this.smartSupport(u, friends, cap);
      if (sup) return act(sup[0], sup[1]);
      const attacks = u.abilities.filter((x) => x.kind === 'attack');
      if (!attacks.length) a = u.abilities[0];
      else {
        const pool = forced.length ? forced : foes;
        a = [...attacks].sort((x, y) => this.attackValue(u, y, pool, this.bestTarget(u, y, pool)) - this.attackValue(u, x, pool, this.bestTarget(u, x, pool)))[0];
      }
    } else if (u.champ === 'trainer') {
      const hurt = friends.filter((f) => f.hp / f.maxHp < 0.4).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      const mend = u.abilities.find((x) => x.kind === 'heal');
      // Heals are limited per battle, so a fight always moves forward (kids answering well must be able to win).
      if (hurt && mend && (u.healsUsed || 0) < cap && this.rand() < 0.6) { u.healsUsed = (u.healsUsed || 0) + 1; return act(mend, hurt); }
      const shield = u.abilities.find((x) => x.kind === 'shield');
      if (shield && this.rand() < 0.15) return act(shield, friends[Math.floor(this.rand() * friends.length)]);
      const attacks = u.abilities.filter((x) => x.kind === 'attack');
      a = this.rand() < 0.3 ? attacks[attacks.length - 1] : attacks[0];
    } else {
      // Plain: heal a hurt friend sometimes, otherwise mostly basic attacks with some specials.
      const list = u.abilities;
      const hurt = friends.filter((f) => f.hp / f.maxHp < 0.5).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      const heal = list.find((x) => x.kind === 'heal');
      if (hurt && heal && (u.healsUsed || 0) < cap && this.rand() < 0.6) { u.healsUsed = (u.healsUsed || 0) + 1; return act(heal, heal.target === 'self' ? u : hurt); }
      const pool = list.filter((x) => x.kind !== 'heal');
      const special = pool.slice(1);
      a = special.length && this.rand() < 0.4 ? special[Math.floor(this.rand() * special.length)] : pool[0] || list[0];
    }
    if (a.target === 'ally' || a.target === 'self' || a.target === 'allAllies') return act(a, a.target === 'ally' ? friends[Math.floor(this.rand() * friends.length)] : u);
    const pool = forced.length ? forced : foes;
    const target = pool.length === 1 ? pool[0]
      : clever || u.champ === 'guardian' && this.smart() ? this.bestTarget(u, a, pool)
        : this.rand() < 0.35 ? [...pool].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0] : pool[Math.floor(this.rand() * pool.length)];
    return act(a, target);
  }

  // ---------- resolving abilities ----------
  targetsFor(u, a, target) {
    switch (a.target) {
      case 'allEnemies': return this.foesOf(u);
      case 'randomEnemies': return this.foesOf(u);
      case 'allAllies': return this.friendsOf(u);
      case 'self': return [u];
      case 'ally': return target && target.alive ? [target] : [u];
      default: return target && target.alive ? [target] : [this.foesOf(u)[0]].filter(Boolean);
    }
  }

  center(x) {
    const r = x.sprite.getBoundingClientRect(), f = this.field.getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height * 0.55 };
  }

  async execute(u, a, target) {
    const targets = this.targetsFor(u, a, target);
    if (!targets.length) return;
    if (a.kind === 'attack') {
      const element = a.fx?.element || u.element;
      const main = targets[Math.floor(targets.length / 2)];
      const crit = this.rand() < 0.06 + (a.critBonus || 0) + (u.side === 'ally' ? (equippedBonus(this.p).luck || 0) * 0.004 : 0);
      const effMult = elementMultiplier(element, main.element, main.species);
      u.sprite.classList.remove('idle');
      u.sprite.classList.add(u.side === 'ally' ? 'lunge-right' : 'lunge-left');
      const fx = playSpell(this.field, {
        from: this.center(u), to: this.center(main), element, family: u.family || undefined, power: a.fx?.power || 'basic',
        stage: u.kind === 'pet' ? u.stage : u.kind === 'champion' ? 3 : Math.min(3, 1 + Math.floor(this.p.wizard.level / 6)),
        crit, effect: effMult > 1 ? 'super' : effMult < 1 ? 'weak' : 'normal', scale: u.champ === 'guardian' ? 1.35 : 1,
      });
      sfx.spell(element, a.fx?.power || 'basic', (fx.impactAt || 600) / 1000);
      await fx.impact;
      sfx.impact(element, a.fx?.power || 'basic', { crit });
      this.hitSoundPower = a.fx?.power || 'basic';
      if (fx.shake) shake(this.field, fx.shake);
      let dealt = 0;
      if (a.target === 'randomEnemies') {
        // Each hit picks a random enemy that's still standing.
        for (let hit = 0; hit < (a.hits || 1); hit++) {
          const alive = this.foesOf(u);
          if (!alive.length) break;
          dealt += this.damage(u, a, alive[Math.floor(this.rand() * alive.length)], crit, element) || 0;
          await sleep(130);
        }
      }
      if (a.splash) {
        for (const t of this.foesOf(u).filter((x) => x !== main)) this.damage(u, { ...a, mult: (a.mult || 1) * a.splash, luckyDouble: 0 }, t, false, element);
      }
      for (const t of targets) {
        if (a.target !== 'randomEnemies') for (let hit = 0; hit < (a.hits || 1); hit++) dealt += this.damage(u, a, t, crit, element) || 0;
        if (a.dot && t.alive) {
          // Lingering damage: a share of the caster's power on each of the target's next turns.
          const [name, icon] = DOT_STYLE[element] || DOT_STYLE.arcane;
          const dmg = Math.max(1, Math.round(u.power * a.dot.mult * elementMultiplier(element, t.element, t.species)));
          t.status.dot = { turns: a.dot.turns, dmg, icon, name };
          this.float(t, `${icon} ${name}!`, 'eff');
          this.pendingOvertimeTip = true;
        }
        if (a.status && t.alive && this.rand() < (a.statusChance ?? 1) && !(t.champ === 'guardian' && this.rand() < 0.5)) this.applyStatus(t, a.status);
        if (a.stamina && t.alive) t.stamina = Math.max(0, t.stamina + a.stamina);
        this.updateUnit(t);
      }
      if (a.drain && dealt > 0) { const back = Math.round(dealt * a.drain); u.hp = Math.min(u.maxHp, u.hp + back); if (u.pet) u.pet.hp = u.hp; this.float(u, `+${back}`, 'heal'); this.updateUnit(u); }
      if (a.selfStamina) u.stamina = Math.min(95, u.stamina + a.selfStamina * (u.side === 'enemy' ? ENEMY_SELF_STAMINA : 1));
      if (a.selfHeal) this.heal(u, a.selfHeal);
      if (a.teamHeal) this.friendsOf(u).forEach((f) => this.heal(f, a.teamHeal));
      if (a.teamShield) this.friendsOf(u).forEach((f) => { f.status.shield = (f.status.shield || 0) + Math.round(f.maxHp * a.teamShield); this.updateUnit(f); });
      if (u.status.empower) { u.status.empower = 0; this.updateUnit(u); }
      this.hitSoundPower = null;
      await fx.done;
      u.sprite.classList.remove('lunge-right', 'lunge-left'); u.sprite.classList.add('idle');
      await this.handleFaints();
    } else if (a.kind === 'heal') {
      sfx.heal();
      for (const t of targets) {
        this.heal(t, a.amount);
        if (a.cleanse) { for (const k of ['freeze', 'stun', 'slow', 'weaken']) t.status[k] = 0; this.updateUnit(t); }
      }
      await sleep(700);
    } else if (a.kind === 'taunt') {
      // Challenge Roar: enemies must attack this unit; teammates hit harder until it gets hit.
      sfx.buff();
      u.status.taunt = a.turns || 3;
      this.float(u, '🎯 Come at me!', 'eff');
      for (const f of this.friendsOf(u).filter((x) => x !== u)) { f.status.rally = a.turns || 3; f.status.rallyAmt = a.rally || 0.3; f.status.rallyBy = u; this.float(f, '🔥 Rallied!', 'heal'); this.updateUnit(f); }
      this.updateUnit(u);
      await sleep(700);
    } else if (a.kind === 'regen') {
      sfx.heal();
      for (const t of targets) { t.status.regen = { turns: a.turns || 3, amount: a.amount }; this.float(t, '🌱 Regrowth', 'heal'); this.updateUnit(t); } this.pendingOvertimeTip = true;
      await sleep(700);
    } else if (a.kind === 'debuff') {
      if (a.status?.freeze) sfx.freeze(); else if (a.status?.stun) sfx.stun(); else if (a.status?.slow) sfx.slow(); else sfx.debuff();
      for (const t of targets) {
        if (a.status && !(t.champ === 'guardian' && this.rand() < 0.5)) this.applyStatus(t, a.status);
        if (a.status?.weaken) this.float(t, '💧 Weakened!', 'eff');
        this.updateUnit(t);
      }
      await sleep(700);
    } else if (a.kind === 'shield') {
      for (const t of targets) { t.status.shield = (t.status.shield || 0) + Math.round(t.maxHp * a.amount); this.float(t, '🛡️ Shield', 'heal'); this.updateUnit(t); }
      sfx.shield(); await sleep(700);
    } else if (a.kind === 'stamina') {
      if (a.stamina > 0) sfx.haste(); else sfx.slow();
      for (const t of targets) {
        t.stamina = Math.max(0, Math.min(99, t.stamina + a.stamina));
        if (a.status) this.applyStatus(t, a.status);
        this.float(t, a.stamina > 0 ? '⏩ Faster!' : '🐢 Slowed!', a.stamina > 0 ? 'heal' : 'eff');
        this.updateUnit(t);
      }
      await sleep(700);
    } else if (a.kind === 'buff') {
      for (const t of targets) {
        this.applyStatus(t, a.status);
        if (a.shieldSelf) t.status.shield = (t.status.shield || 0) + Math.round(t.maxHp * a.shieldSelf);
        this.float(t, a.status?.armor ? '🪨 Armored!' : '💪 Empowered!', 'heal');
        this.updateUnit(t);
      }
      if (a.shieldSelf) sfx.shield(); else sfx.buff();
      await sleep(700);
    }
  }

  damage(u, a, t, crit, element) {
    if (!t.alive) return;
    const eff = elementMultiplier(element, t.element, t.species);
    let dmg = u.power * (a.mult || 1) * eff * (0.9 + this.rand() * 0.2) * (crit ? 1.5 : 1) * (u.status.empower ? 2 : 1);
    if (a.luckyDouble && this.rand() < a.luckyDouble) { dmg *= 2; this.float(t, 'Lucky ×2!', 'eff'); }
    if (u.status.weaken) dmg *= 0.7;
    if (u.status.rally) dmg *= 1 + (u.status.rallyAmt || 0.3);
    if (!a.pierce) dmg -= t.ward * 0.45;
    if (t.status.armor && !a.pierce) dmg *= 0.65;
    if (u.side === 'enemy' && this.gentle) dmg *= 0.75;
    dmg = Math.max(u.side === 'enemy' ? 1 : 2, Math.round(dmg));
    if (t.status.shield > 0 && !a.pierce) {
      const absorbed = Math.min(t.status.shield, dmg);
      t.status.shield -= absorbed; dmg -= absorbed;
      if (absorbed) this.float(t, `🛡️ −${absorbed}`, 'heal');
    }
    t.hp = Math.max(0, t.hp - dmg);
    if (t.pet) t.pet.hp = t.hp;
    if (t.status.taunt && dmg > 0) { this.endTaunt(t); this.float(t, 'Roar broken!', 'eff'); }
    sfx.impact(element, this.hitSoundPower || 'basic', { light: true });
    if (dmg > 0) this.float(t, `−${dmg}`);
    if (eff > 1) this.float(t, 'Super effective!', 'eff');
    else if (eff <= 0.5) this.float(t, 'Resisted!', 'eff');
    else if (eff < 1) this.float(t, 'Not very effective', 'eff');
    if (crit) this.float(t, 'Critical!', 'eff');
    this.hurtFlash(t);
    this.updateUnit(t);
    return dmg;
  }

  heal(t, frac) {
    if (!t.alive) return;
    const amt = Math.round(t.maxHp * frac);
    t.hp = Math.min(t.maxHp, t.hp + amt);
    if (t.pet) t.pet.hp = t.hp;
    this.float(t, `+${amt}`, 'heal');
    this.updateUnit(t);
  }

  applyStatus(t, status) {
    for (const [k, v] of Object.entries(status)) t.status[k] = Math.max(t.status[k] || 0, v);
    if (status.freeze) { this.float(t, '❄️ Frozen!', 'eff'); setTimeout(() => sfx.freeze(), 150); }
    if (status.stun) { this.float(t, '💫 Stunned!', 'eff'); setTimeout(() => sfx.stun(), 150); }
    if (status.freeze || status.stun) this.pendingStatusTip = true;
  }

  hurtFlash(t) {
    t.sprite.classList.remove('idle', 'hit');
    void t.sprite.offsetWidth;
    t.sprite.classList.add('hit');
    if (t.species) {
      t.sprite.innerHTML = creatureSVG(t.species, t.stage, { variant: t.rare ? 'rare' : 'normal', facing: t.side === 'ally' ? 'right' : 'left', mood: 'hurt' });
      setTimeout(() => { if (t.alive) t.sprite.innerHTML = t.artNormal; }, 650);
    }
    setTimeout(() => { t.sprite.classList.remove('hit'); if (t.alive) t.sprite.classList.add('idle'); }, 480);
  }

  async handleFaints() {
    for (const t of this.units) {
      if (t.alive && t.hp <= 0) {
        t.alive = false;
        playFaint(this.field, this.center(t));
        t.el.classList.add('fainted');
        this.say(t.side === 'ally' ? `${t.name} needs a rest!` : `${t.name} is worn out!`, true);
        await sleep(700);
      }
    }
  }

  async befriend(u, target) {
    sfx.catch();
    const fx = playCatch(this.field, this.center(target));
    target.sprite.classList.remove('idle');
    target.sprite.classList.add('caught');
    await fx.done;
    target.alive = false;
    target.captured = true;
    target.el.classList.add('fainted');
    const pet = newPet(target.species, target.level - (target.leader ? 2 : 0), { rare: target.rare, area: this.o.area?.id, stage: target.stage });
    track('befriend', { sp: target.species, lv: pet.level, st: pet.stage, cls: SPECIES[target.species]?.cls, rare: !!target.rare, hp: +(target.hp / target.maxHp).toFixed(2), area: this.o.area?.id });
    addPet(this.p, pet);
    this.caughtList.push(pet);
    this.say(`${target.name} wants to join your team!`, true);
    await sleep(900);
  }

  float(t, text, cls = '') {
    const c = this.center(t);
    // Several pop-ups at once (damage, "Super effective!", "Critical!") stack downward over the pet's body, clear of its name plate.
    const n = t._floats = (t._floats || 0) + 1;
    clearTimeout(t._floatReset);
    t._floatReset = setTimeout(() => { t._floats = 0; }, 700);
    const el = h('div.float-num' + (cls ? '.' + cls : ''), { style: { left: (c.x + (this.rand() - 0.5) * 30) + 'px', top: (c.y - 30 + (n - 1) * 30) + 'px' } }, text);
    this.field.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ---------- end ----------
  finish(result) {
    if (this.over) return;
    this.over = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    const won = result === 'win';
    if (won) {
      const foesLevels = this.units.filter((x) => x.side === 'enemy').reduce((s, e) => s + e.level, 0);
      const bonus = 6 + Math.round(foesLevels * 1.6);
      teamPets(this.p).forEach((pt, i) => this.levelEvents.push(...giveXP(this.p, pt, i === 0 ? bonus : Math.round(bonus * 0.6))));
      this.xpTotal += bonus;
      giveWizardXP(this.p, 6 + Math.round(foesLevels * 0.8));
    }
    persist();
    this.el?.remove();
    const foes = this.units.filter((x) => x.side === 'enemy');
    try {
      const u2 = (x) => ({ sp: x.species || x.champ || x.kind, lv: x.level, st: x.stage, cls: x.species ? SPECIES[x.species]?.cls : null, rk: x.pet?.rank || undefined, hp: +(Math.max(0, x.hp) / x.maxHp).toFixed(2), alive: x.alive, caught: !!x.captured });
      track('battle', { kind: this.o.kind, area: this.o.area?.id, result, ms: Date.now() - this.log.t0, turns: this.log.turns, pturns: this.log.playerTurns, q: this.log.questions, ok: this.log.correct, second: this.log.second, hints: this.hints, escale: +(this.enemyScale || 1).toFixed(2), wiz: this.p.wizard.level,
        team: this.units.filter((x) => x.side === 'ally').map(u2), foes: foes.map(u2) });
    } catch (e) { /* never block play */ }
    const allCaught = won && foes.length && foes.every((x) => x.captured);
    this.resolve({
      result: allCaught && foes.length === 1 ? 'caught' : result,
      xp: this.xpTotal, hints: this.hints, levelEvents: this.levelEvents, tierUps: this.tierUps,
      caughtList: this.caughtList, caught: this.caughtList[0] || null,
      foeSpecies: foes.filter((x) => x.species).map((x) => x.species), teamSpecies: this.units.filter((x) => x.side === 'ally' && x.species).map((x) => x.species),
      before: this.before, after: snapshot(this.p),
    });
  }
}

function unit(u) {
  return { hp: u.maxHp, stamina: 0, alive: true, status: {}, stage: 1, family: null, ...u };
}

// In battle, a pet shows its basic move plus its 4 newest moves.
function battleSet(list) { return list.length <= 5 ? list : [list[0], ...list.slice(-4)]; }

/** Champions were tuned when evolving gave pets ×1.3 / ×1.6; evolving now gives ×1.2 / ×1.4, so champions scale to match. */
// Most heals an enemy can cast in one battle [TUNABLE] (unlimited heals made some fights impossible to win).
const ENEMY_HEALS = { trainer: 2, guardian: 3, mini: 2, wild: 1 };
// A Mini Guardian's [health, power] compared with a full Guardian of the same level [TUNABLE].
// The final Guardian's extra health [TUNABLE]: v43 bots won all first tries, finishing with ~46% of their health.
const GUARDIAN_HP = 1.25;
const GUARDIAN_POW = 1;   // v45 tried 1.1 (2 of 4 first tries won, on target); v46 evolves its helpers, so back to 1
const MINI_GUARDIAN = [0.9, 1];   // v44: was [0.6, 0.85] (won on all 7 first tries); v46: was [0.85, 1] (4 of 4 won, teams kept ~32% health); v54: 0.95 → 0.9
// Enemy pets don't pay move costs, so "acts again sooner" moves (Quick, Dash, Blitz) refill only half as much stamina
// for them [TUNABLE]. At full value a swift trainer pet acted 2-3 times per turn of yours (the test lost 4 of 4 fights
// with every answer right).
const ENEMY_SELF_STAMINA = 0.5;
// By area depth. v46 raised all to 1.3 (areas 1–3 were won 100% of the time), but a test bot then lost its 2nd battle
// ever with 8 of 9 right, so area 1 (where kids start) stays at the old 1.15.
const WILD_POWER = { 1: 1.15, 2: 1.3, 3: 1.45, 4: 1.35 };   // v49: areas 3–4 were 1.3 (v48 bots won every deep wild battle); v55: area 4 back down (bots lost 1 in 4 there, with the hardest questions)
// Health share for each wild pet by group size [TUNABLE].
const GROUP_HP = { 1: 1, 2: 0.85, 3: 0.72 };
const champScale = (L) => (L >= 28 ? 1.4 / 1.6 : L >= 14 ? 1.2 / 1.3 : 1);

function enemyPet({ species, level, stage, rare = false, leader = false }, scale = 1, hpScale = 1) {
  const lvl = Math.max(1, level);
  const st = stage || stageForLevel(species, lvl);
  const s = petStats({ species, stage: st, level: lvl, rare });
  const sp = SPECIES[species];
  const boost = leader ? 1.6 : 1;
  return unit({
    side: 'enemy', kind: 'pet', name: sp.names[st - 1], species, stage: st, rare, leader, level: lvl + (leader ? 2 : 0),
    element: sp.element, family: sp.family, maxHp: Math.round(s.maxHp * boost * scale * hpScale), power: s.power * (leader ? 1.25 : 1) * scale, ward: s.ward,
    speed: s.speed, abilities: battleSet(petAbilitiesFor(sp, st, lvl + (leader ? 6 : 0))),
  });
}

/** Levels and XP for the wizard and team pets, used by the results screen. */
export function snapshot(profile) {
  return {
    wizard: { level: profile.wizard.level, xp: profile.wizard.xp },
    pets: Object.fromEntries(teamPets(profile).map((p) => [p.id, { level: p.level, xp: p.xp, stage: p.stage }])),
  };
}

// Second-try strength [TUNABLE]: an ability cast after a wrong first answer works at this share.
const SECOND_TRY = 0.5;
/** A copy of an ability with its numbers scaled (damage, heals, shields, stamina, buff turns, chance to freeze/stun). */
function scaleAbility(a, k) {
  const out = { ...a };
  for (const key of ['mult', 'amount', 'stamina', 'selfHeal', 'teamHeal', 'teamShield', 'selfStamina', 'shieldSelf', 'drain', 'rally']) if (typeof a[key] === 'number') out[key] = a[key] * k;
  if (a.dot) out.dot = { ...a.dot, mult: a.dot.mult * k };
  if (a.status) {
    // Attacks: half the chance to freeze/stun. Other spells: effects last half as long (at least 1 turn).
    if (a.kind === 'attack') out.statusChance = (a.statusChance ?? 1) * k;
    else out.status = Object.fromEntries(Object.entries(a.status).map(([s2, v]) => [s2, Math.max(1, Math.ceil(v * k))]));
  }
  out.luckyDouble = 0;
  return out;
}

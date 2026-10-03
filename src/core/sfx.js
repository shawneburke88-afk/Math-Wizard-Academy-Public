// Synthesized sound effects (no audio files needed). Audio unlocks on the first tap (iPadOS rule).
// Spells have their own sounds per element: Storm crackles like electricity, Star sparkles,
// Vine rustles and whips, Stone rumbles and crunches, Arcane zaps.
let ctx = null;
let out = null;          // sound-effects bus
let musicBus = null;     // music bus (music.js plays into it)
let noiseBuf = null;
let on = true;
const unlockListeners = new Set();

// ---- volume settings (per device, so the quick control works on every screen, even before a wizard is picked) ----
const PREFS_KEY = 'mwa-audio-v1';
const prefs = (() => {
  const d = { music: 0.6, sfx: 0.9, musicOn: true, sfxOn: true };
  try { return { ...d, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) }; } catch (e) { return d; }
})();
const prefListeners = new Set();
export const audioPrefs = () => ({ ...prefs });
export const onAudioPrefs = (fn) => { prefListeners.add(fn); return () => prefListeners.delete(fn); };
/** Change volume settings: { music, sfx } are 0..1, { musicOn, sfxOn } are switches. */
export function setAudioPrefs(patch) {
  Object.assign(prefs, patch);
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ }
  applyVolumes();
  prefListeners.forEach((fn) => fn(audioPrefs()));
}
function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  out.gain.setTargetAtTime(prefs.sfxOn && on ? 0.9 * prefs.sfx : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(prefs.musicOn ? 0.55 * prefs.music * prefs.music : 0, t, 0.15);   // squared: a slider that feels even
}

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // A compressor keeps layered spell sounds (and music underneath) from clipping.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
      comp.connect(ctx.destination);
      out = ctx.createGain(); out.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(comp);
      applyVolumes();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      unlockListeners.forEach((fn) => fn());
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}
/** For music.js: the shared audio context, music bus and noise buffer (null until the first tap unlocks audio). */
export const audioParts = () => (ctx ? { ctx, musicBus, noiseBuf } : null);
export const onAudioUnlock = (fn) => { unlockListeners.add(fn); if (ctx) fn(); };
// Pause all sound while the game is in the background (saves the iPad's battery).
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') ctx.suspend?.(); else ctx.resume?.();
});
/** Old per-wizard sound switch: now only mutes sound effects on top of the device setting. */
export const setSound = (v) => { on = v !== false; applyVolumes(); };
const ready = () => on && prefs.sfxOn && ctx && out;
const rnd = (a, b) => a + Math.random() * (b - a);

/** Gain envelope: quick attack, exponential decay. */
function env(t0, dur, vol, attack = 0.01) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(attack, dur * 0.8));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return g;
}

function tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, slide = 0, attack = 0.02, vibrato = 0, vibRate = 7, filter = null } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = vibRate; lg.gain.value = vibrato;
    lfo.connect(lg).connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
  }
  const g = env(t0, dur, vol, attack);
  let node = o;
  if (filter) { const f = ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.setValueAtTime(filter.freq, t0); if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t0 + dur); f.Q.value = filter.q || 1; node = o.connect(f); }
  node.connect(g).connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Filtered white noise. `gate` chops the volume on and off for crackles and rustles. */
function noise(dur, { delay = 0, vol = 0.2, type = 'bandpass', freq = 1000, to = 0, q = 1, attack = 0.01, gate = 0, gateMin = 0 } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = env(t0, dur, vol, attack);
  let last = f;
  if (gate) {
    // Random on/off steps every `gate` seconds, like sparks jumping.
    const chop = ctx.createGain();
    chop.gain.setValueAtTime(1, t0);
    for (let t = 0; t < dur; t += gate * rnd(0.5, 1.5)) chop.gain.setValueAtTime(Math.random() < 0.45 ? gateMin : rnd(0.4, 1), t0 + t);
    last = f.connect(chop);
  }
  src.connect(f); last.connect(g).connect(out);
  src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
}

const SIZE = { basic: 1, power: 1.25, ultimate: 1.55 };

// ---- Cast sounds: play while the spell flies (dur = seconds until it lands) ----
const CAST = {
  storm(dur, k) {
    // Electric buzz: a low hum through a narrow filter, chopped into sparks, plus crackling static.
    tone(95, dur, { type: 'sawtooth', vol: 0.05 * k, attack: 0.03, vibrato: 18, vibRate: 31, filter: { type: 'bandpass', freq: 1400, to: 2600, q: 3 } });
    tone(190, dur, { type: 'square', vol: 0.025 * k, attack: 0.03, vibrato: 40, vibRate: 47, filter: { type: 'bandpass', freq: 2200, q: 4 } });
    noise(dur, { vol: 0.16 * k, type: 'highpass', freq: 2500, gate: 0.018, attack: 0.02 });
    noise(dur * 0.8, { delay: dur * 0.2, vol: 0.1 * k, type: 'bandpass', freq: 5000, q: 2, gate: 0.01 });
  },
  star(dur, k) {
    // Twinkling sparkles rising, over a soft whoosh.
    noise(dur, { vol: 0.05 * k, type: 'bandpass', freq: 1500, to: 6000, q: 1.5, attack: dur * 0.5 });
    const n = Math.round(6 * k + dur * 6);
    for (let i = 0; i < n; i++) tone(rnd(1800, 4200), 0.18, { type: 'sine', vol: 0.045, delay: (i / n) * dur, attack: 0.005 });
  },
  vine(dur, k) {
    // Rustling leaves, then a whip crack as it lands.
    noise(dur, { vol: 0.12 * k, type: 'bandpass', freq: 3200, q: 1.2, gate: 0.035, gateMin: 0.15, attack: 0.05 });
    noise(0.22, { delay: Math.max(0, dur - 0.22), vol: 0.2 * k, type: 'bandpass', freq: 600, to: 5000, q: 2, attack: 0.18 });
  },
  stone(dur, k) {
    // A growing rumble and grinding rock.
    noise(dur, { vol: 0.28 * k, type: 'lowpass', freq: 120, to: 320, q: 0.8, attack: dur * 0.7 });
    tone(52, dur, { type: 'sawtooth', vol: 0.06 * k, attack: dur * 0.6, filter: { type: 'lowpass', freq: 200, to: 420 } });
    noise(dur, { vol: 0.06 * k, type: 'bandpass', freq: 900, q: 1, gate: 0.03, attack: dur * 0.5 });
  },
  arcane(dur, k) {
    // A wobbly magic "pew" that climbs.
    tone(380, dur, { type: 'sine', vol: 0.14 * k, slide: 1300, vibrato: 30, vibRate: 11 });
    tone(760, dur, { type: 'triangle', vol: 0.035 * k, slide: 2400, vibrato: 50, vibRate: 11 });
  },
};

// ---- Impact sounds: when the spell hits ----
const IMPACT = {
  storm(k, big) {
    // A sharp electric crack; bigger spells add rolling thunder.
    noise(0.09, { vol: 0.35 * k, type: 'highpass', freq: 1800, attack: 0.002 });
    noise(0.25, { vol: 0.18 * k, type: 'bandpass', freq: 3500, q: 1.5, gate: 0.012, attack: 0.002 });
    tone(140, 0.12, { type: 'square', vol: 0.06 * k, slide: -90 });
    if (big) noise(1.1 * k, { delay: 0.05, vol: 0.32 * k, type: 'lowpass', freq: 260, to: 70, q: 0.7, attack: 0.08 });
  },
  star(k, big) {
    // A bright bell chord with a sparkle.
    [1047, 1319, 1568].forEach((f, i) => tone(f, 0.55, { type: 'sine', vol: 0.07 * k, delay: i * 0.03, attack: 0.004 }));
    tone(2093, 0.4, { type: 'triangle', vol: 0.03 * k, attack: 0.004 });
    noise(0.2, { vol: 0.08 * k, type: 'highpass', freq: 5000, attack: 0.003 });
    if (big) [2637, 3136, 3951].forEach((f, i) => tone(f, 0.3, { type: 'sine', vol: 0.035, delay: 0.1 + i * 0.07, attack: 0.004 }));
  },
  vine(k, big) {
    // A woody thwack.
    noise(0.06, { vol: 0.3 * k, type: 'bandpass', freq: 1600, q: 1.5, attack: 0.002 });
    tone(190, 0.16, { type: 'triangle', vol: 0.18 * k, slide: -100, attack: 0.003 });
    if (big) noise(0.35, { delay: 0.04, vol: 0.1 * k, type: 'bandpass', freq: 2800, q: 1, gate: 0.03 });
  },
  stone(k, big) {
    // A heavy boom and gravel crunch.
    tone(90, 0.35 * k, { type: 'sine', vol: 0.3 * k, slide: -50, attack: 0.004 });
    noise(0.28, { vol: 0.3 * k, type: 'lowpass', freq: 1100, to: 300, attack: 0.003, gate: 0.02, gateMin: 0.2 });
    if (big) noise(0.8, { delay: 0.05, vol: 0.14 * k, type: 'bandpass', freq: 700, q: 0.8, gate: 0.04, gateMin: 0.1 });
  },
  arcane(k, big) {
    tone(900, 0.2, { type: 'sine', vol: 0.2 * k, slide: -700, attack: 0.003 });
    noise(0.08, { vol: 0.12 * k, type: 'bandpass', freq: 2500, attack: 0.002 });
    if (big) tone(1800, 0.3, { type: 'triangle', vol: 0.04, slide: -1400, delay: 0.05 });
  },
};

let lastHit = 0;

export const sfx = {
  tap: () => tone(660, 0.08, { type: 'triangle', vol: 0.08 }),
  correct: () => { tone(784, 0.12, { type: 'triangle' }); tone(1047, 0.2, { type: 'triangle', delay: 0.1 }); },
  wrong: () => tone(220, 0.25, { type: 'sine', vol: 0.12, slide: -60 }),
  hit: () => { tone(160, 0.12, { type: 'square', vol: 0.08, slide: -80 }); tone(90, 0.15, { type: 'sine', vol: 0.12, delay: 0.03 }); },
  cast: () => { tone(500, 0.25, { type: 'sawtooth', vol: 0.05, slide: 700 }); },

  /** An attack spell flying: element-specific, bigger for stronger spells. `dur` = seconds until impact. */
  spell(element, power = 'basic', dur = 0.6) {
    if (!ready()) return;
    (CAST[element] || CAST.arcane)(Math.max(0.2, dur), SIZE[power] || 1);
  },
  /** The spell landing. Extra hits on the same moment are thinned out so multi-hits don't get too loud. */
  impact(element, power = 'basic', { crit = false, light = false } = {}) {
    if (!ready()) return;
    const now = ctx.currentTime;
    if (now - lastHit < 0.07) return;
    lastHit = now;
    const k = (SIZE[power] || 1) * (light ? 0.6 : 1) * (crit ? 1.2 : 1);
    (IMPACT[element] || IMPACT.arcane)(k, !light && power !== 'basic');
    if (crit && !light) tone(1400, 0.15, { type: 'square', vol: 0.04, slide: 600, delay: 0.05 });
  },

  // ---- Support spells and status effects ----
  heal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, { type: 'sine', vol: 0.176, delay: i * 0.08, attack: 0.03 })); noise(0.6, { vol: 0.066, type: 'highpass', freq: 6000, attack: 0.2 }); },
  shield: () => { [523, 1310, 2100].forEach((f, i) => tone(f, 0.9 - i * 0.2, { type: 'sine', vol: 0.24 / (i + 1), attack: 0.004 })); tone(262, 0.3, { type: 'triangle', vol: 0.18, attack: 0.004 }); },
  buff: () => { tone(200, 0.45, { type: 'square', vol: 0.15, slide: 700, filter: { type: 'lowpass', freq: 600, to: 3000 } }); tone(400, 0.45, { type: 'triangle', vol: 0.15, slide: 1200, delay: 0.05 }); },
  debuff: () => { tone(420, 0.5, { type: 'sawtooth', vol: 0.18, slide: -300, filter: { type: 'lowpass', freq: 2200, to: 300, q: 6 } }); },
  haste: () => { tone(500, 0.18, { type: 'triangle', vol: 0.32, slide: 1500 }); noise(0.18, { vol: 0.32, type: 'bandpass', freq: 1500, to: 6000, q: 2 }); },
  slow: () => { tone(300, 0.6, { type: 'sine', vol: 0.3, slide: -200, vibrato: 12, vibRate: 5 }); },
  freeze: () => { for (let i = 0; i < 7; i++) tone(rnd(2800, 5200), 0.25, { type: 'sine', vol: 0.15, delay: i * 0.045, attack: 0.003 }); noise(0.45, { vol: 0.21, type: 'highpass', freq: 7000, attack: 0.02 }); },
  stun: () => { tone(260, 0.5, { type: 'sine', vol: 0.36, slide: 200, vibrato: 60, vibRate: 13 }); },

  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.1 })),
  catch: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: 'triangle', delay: i * 0.07 })),
  chest: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.12 })),
  encounter: () => [330, 392, 330, 494].forEach((f, i) => tone(f, 0.1, { type: 'square', vol: 0.05, delay: i * 0.08 })),
  step: () => tone(120, 0.03, { type: 'sine', vol: 0.02 }),
  discover: () => [880, 1320].forEach((f, i) => tone(f, 0.15, { type: 'sine', vol: 0.1, delay: i * 0.08 })),
};

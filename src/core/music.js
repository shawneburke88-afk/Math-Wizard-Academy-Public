// Generated music (no audio files). Each region has its own key, mode, instruments and a theme melody:
// calm and spacious while exploring, and a livelier battle version of the same theme (faster, with drums,
// bass and an arpeggio). Tracks crossfade when the region or mode changes.
import { audioParts, onAudioUnlock } from './sfx.js';
import { mulberry32 } from './rng.js';

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

// Per region [TUNABLE]. root = MIDI note of the key; prog = chord roots as scale degrees (0 = I);
// lead = melody instrument; texture = a background sound that sets the place.
export const THEMES = {
  academy: { root: 57, mode: 'major', bpm: 76, battleBpm: 124, prog: [0, 5, 3, 4], lead: 'musicbox', texture: 'none', seed: 11 },
  number: { root: 62, mode: 'lydian', bpm: 66, battleBpm: 128, prog: [0, 1, 5, 4], lead: 'bell', texture: 'shimmer', seed: 23 },
  patterns: { root: 60, mode: 'dorian', bpm: 72, battleBpm: 126, prog: [0, 3, 6, 4], lead: 'marimba', texture: 'rustle', seed: 37 },
  shape: { root: 55, mode: 'aeolian', bpm: 64, battleBpm: 122, prog: [0, 5, 2, 6], lead: 'kalimba', texture: 'drone', seed: 41 },
  stats: { root: 64, mode: 'mixolydian', bpm: 70, battleBpm: 130, prog: [0, 6, 3, 0], lead: 'flute', texture: 'waves', seed: 53 },
};

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let reverb = null;
let current = null;      // { key, track }
let wanted = null;       // what should play (remembered until audio unlocks)

// ---------- shared effects ----------
function makeReverb(ctx, bus) {
  // A soft hall: decaying noise as the impulse response.
  const len = Math.floor(ctx.sampleRate * 2.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const g = ctx.createGain(); g.gain.value = 0.9;
  conv.connect(g).connect(bus);
  return conv;
}

// ---------- instruments: each plays one note into `dest` ----------
function envGain(ctx, t, attack, hold, release, vol) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}
function osc(ctx, type, hz, t, end, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(hz, t); o.detune.value = detune;
  o.start(t); o.stop(end + 0.05);
  return o;
}
const VOICES = {
  bell(ctx, hz, t, dur, vol, dest) {
    const end = t + 2.6;
    const g = envGain(ctx, t, 0.005, 0, 2.5, vol);
    osc(ctx, 'sine', hz, t, end).connect(g);
    const g2 = envGain(ctx, t, 0.005, 0, 0.9, vol * 0.35);
    osc(ctx, 'sine', hz * 2.76, t, end).connect(g2);   // bell-like overtone
    g.connect(dest); g2.connect(dest);
  },
  musicbox(ctx, hz, t, dur, vol, dest) {
    const end = t + 1.4;
    const g = envGain(ctx, t, 0.004, 0, 1.3, vol);
    osc(ctx, 'sine', hz, t, end).connect(g);
    const g2 = envGain(ctx, t, 0.004, 0, 0.4, vol * 0.25);
    osc(ctx, 'sine', hz * 4, t, end).connect(g2);
    g.connect(dest); g2.connect(dest);
  },
  marimba(ctx, hz, t, dur, vol, dest) {
    const end = t + 0.8;
    const g = envGain(ctx, t, 0.003, 0, 0.7, vol);
    osc(ctx, 'sine', hz, t, end).connect(g);
    const g2 = envGain(ctx, t, 0.002, 0, 0.08, vol * 0.5);
    osc(ctx, 'triangle', hz * 3.9, t, end).connect(g2);
    g.connect(dest); g2.connect(dest);
  },
  kalimba(ctx, hz, t, dur, vol, dest) {
    const end = t + 1.1;
    const o = osc(ctx, 'triangle', hz * 1.02, t, end);
    o.frequency.exponentialRampToValueAtTime(hz, t + 0.03);   // a tiny pitch drop, like a plucked tine
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = hz * 5;
    const g = envGain(ctx, t, 0.003, 0, 1.0, vol);
    o.connect(f).connect(g).connect(dest);
  },
  flute(ctx, hz, t, dur, vol, dest) {
    const len = Math.max(0.25, dur);
    const end = t + len + 0.35;
    const o = osc(ctx, 'sine', hz, t, end);
    const lfo = osc(ctx, 'sine', 5, t, end), lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz * 0.008, t + 0.3);   // vibrato fades in
    lfo.connect(lg).connect(o.frequency);
    const g = envGain(ctx, t, 0.09, len * 0.6, len * 0.4 + 0.3, vol);
    o.connect(g).connect(dest);
  },
  pad(ctx, hz, t, dur, vol, dest) {
    const end = t + dur + 2.2;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.4;
    const g = envGain(ctx, t, Math.min(1.6, dur * 0.4), dur * 0.5, 2.0, vol);
    for (const d of [-7, 7]) osc(ctx, 'sawtooth', hz, t, end, d).connect(f);
    osc(ctx, 'triangle', hz / 2, t, end).connect(f);
    f.connect(g).connect(dest);
  },
  softbass(ctx, hz, t, dur, vol, dest) {
    const g = envGain(ctx, t, 0.08, dur * 0.6, dur * 0.5, vol);
    osc(ctx, 'sine', hz, t, t + dur * 1.2).connect(g); g.connect(dest);
  },
  pluckbass(ctx, hz, t, dur, vol, dest) {
    const end = t + dur + 0.1;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(hz * 8, t); f.frequency.exponentialRampToValueAtTime(hz * 1.5, t + 0.18);
    const g = envGain(ctx, t, 0.004, dur * 0.5, dur * 0.4, vol);
    osc(ctx, 'sawtooth', hz, t, end).connect(f);
    osc(ctx, 'sine', hz / 2, t, end).connect(g);
    f.connect(g).connect(dest);
  },
};
function drum(ctx, kind, t, vol, dest, noiseBuf) {
  if (kind === 'kick') {
    const o = osc(ctx, 'sine', 140, t, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = envGain(ctx, t, 0.002, 0.02, 0.22, vol);
    o.connect(g).connect(dest);
    return;
  }
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; }
  else { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; }
  const len = kind === 'hat' ? 0.05 : 0.16;
  const g = envGain(ctx, t, 0.002, 0, len, vol);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random()); src.stop(t + len + 0.05);
  if (kind === 'snare') { const g2 = envGain(ctx, t, 0.002, 0, 0.08, vol * 0.6); osc(ctx, 'triangle', 190, t, t + 0.12).connect(g2); g2.connect(dest); }
}
function texture(ctx, kind, t, barLen, dest, noiseBuf, rand, scaleHz) {
  if (kind === 'shimmer') {   // twinkling stars: a few very quiet high bells
    for (let i = 0; i < 3; i++) if (rand() < 0.5) VOICES.bell(ctx, scaleHz(14 + Math.floor(rand() * 6)), t + rand() * barLen, 0.2, 0.025, dest);
  } else if (kind === 'waves' || kind === 'rustle') {   // sea swell / leaves: slow filtered noise
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'waves' ? 'lowpass' : 'bandpass';
    f.frequency.value = kind === 'waves' ? 500 : 2600; f.Q.value = kind === 'waves' ? 0.3 : 0.6;
    const len = barLen * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === 'waves' ? 0.05 : 0.018, t + len * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(dest);
    src.start(t, rand()); src.stop(t + len + 0.1);
  } else if (kind === 'drone') {   // canyon wind: a low hum on the root
    VOICES.pad(ctx, scaleHz(-7), t, barLen * 2, 0.03, dest);
  }
}

// ---------- composition ----------
/** Builds the scale helpers and a fixed theme melody for a region (the same every time you visit). */
function compose(theme) {
  const rand = mulberry32(theme.seed);
  const sc = MODES[theme.mode];
  const note = (deg) => theme.root + 12 * Math.floor(deg / 7) + sc[((deg % 7) + 7) % 7];   // scale degree → MIDI
  // Melody: 8 bars of (degree, length in 8ths). Steps mostly move by a scale step or two, so it sings.
  const melody = [];
  let deg = 7 + [0, 2, 4][Math.floor(rand() * 3)];
  for (let bar = 0; bar < 8; bar++) {
    let pos = 0;
    const notes = [];
    while (pos < 8) {
      const len = [1, 2, 2, 3, 4][Math.floor(rand() * 5)];
      const r = rand();
      deg += r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : -2;
      deg = Math.max(5, Math.min(13, deg));
      notes.push({ pos, deg, len: Math.min(len, 8 - pos) });
      pos += len;
    }
    // Phrases end on a chord tone of the bar's chord.
    const last = notes[notes.length - 1];
    const root = theme.prog[Math.floor(bar / 2) % theme.prog.length];
    if (bar % 2 === 1) last.deg = 7 + root + (rand() < 0.5 ? 0 : 2);
    melody.push(notes);
  }
  return { note, melody };
}

/** One playing track (a region in explore or battle mode). */
function startTrack(key) {
  const parts = audioParts();
  if (!parts) return null;
  const { ctx, musicBus, noiseBuf } = parts;
  if (!reverb) reverb = makeReverb(ctx, musicBus);
  const [region, mode] = key.split(':');
  const theme = THEMES[region] || THEMES.academy;
  const battle = mode === 'battle';
  const { note, melody } = compose(theme);
  const hz = (deg) => midiHz(note(deg));
  const rand = mulberry32(Date.now() & 0xffff);
  const bpm = battle ? theme.battleBpm : theme.bpm;
  const step = 60 / bpm / 4;           // one 16th note in seconds
  const barLen = step * 16;

  // Routing: track gain (for crossfades) → music bus, plus a reverb send and an echo for the melody.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + (battle ? 0.6 : 2.5));
  gain.connect(musicBus);
  const send = ctx.createGain(); send.gain.value = battle ? 0.25 : 0.6; send.connect(reverb);
  const dry = ctx.createGain(); dry.connect(gain); dry.connect(send);
  const echo = ctx.createDelay(1.5); echo.delayTime.value = step * 3;   // dotted-8th echo
  const fb = ctx.createGain(); fb.gain.value = battle ? 0.2 : 0.38;
  const echoOut = ctx.createGain(); echoOut.gain.value = 0.35;
  echo.connect(fb).connect(echo); echo.connect(echoOut).connect(dry);
  const lead = ctx.createGain(); lead.connect(dry); lead.connect(echo);
  // Everything scheduled into this track also passes through `gain`; stopping just fades it out.
  const leadVoice = VOICES[theme.lead] || VOICES.bell;

  let n = 0;                            // 16th-note counter
  let nextT = ctx.currentTime + 0.15;
  let resting = false;
  const chordAt = (bar) => theme.prog[Math.floor(battle ? bar : bar / 2) % theme.prog.length];
  const chordDegs = (root) => [root, root + 2, root + 4];

  function schedule(t, i) {
    const s = i % 16, bar = Math.floor(i / 16);
    const root = chordAt(bar);
    // Pads: long chords (every 2 bars exploring, every bar in battle).
    if (s === 0 && (battle || bar % 2 === 0)) {
      const len = battle ? barLen : barLen * 2;
      for (const d of chordDegs(root)) VOICES.pad(ctx, hz(d), t, len, battle ? 0.035 : 0.05, dry);
      if (!battle) VOICES.softbass(ctx, hz(root - 7), t, len, 0.12, dry);
      if (!battle && bar % 2 === 0) texture(ctx, theme.texture, t, barLen, dry, noiseBuf, rand, hz);
    }
    if (battle) {
      // Drums: kick on 1 and 3 (plus a push before 3 now and then), snare on 2 and 4, hats on 8ths.
      if (s === 0 || s === 8 || (s === 6 && bar % 2 === 1)) drum(ctx, 'kick', t, 0.5, gain, noiseBuf);
      if (s === 4 || s === 12) drum(ctx, 'snare', t, 0.22, dry, noiseBuf);
      if (s % 2 === 0) drum(ctx, 'hat', t, s % 4 === 2 ? 0.08 : 0.04, gain, noiseBuf);
      // Driving bass on 8ths: root, with an octave jump on the off-beats.
      if (s % 2 === 0) VOICES.pluckbass(ctx, hz(root - 14 + (s % 4 === 2 ? 7 : 0)), t, step * 1.8, 0.13, gain);
      // Arpeggio on 16ths through the chord tones.
      const arp = chordDegs(root).concat([root + 7]);
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      VOICES[theme.lead === 'flute' ? 'marimba' : theme.lead](ctx, hz(arp[pattern[s % 8]]), t, step, 0.035, dry);
    }
    // Melody on 8th-note positions: the theme, always in battle; exploring, some 2-bar phrases rest to leave space.
    const mBar = bar % 8;
    if (!battle && s === 0 && mBar % 2 === 0) resting = rand() < 0.35;
    if (s % 2 === 0 && (battle || !resting)) {
      const hit = melody[mBar].find((m) => m.pos === s / 2);
      if (hit) leadVoice(ctx, hz(hit.deg), t, hit.len * step * 2, battle ? 0.1 : 0.085, lead);
    }
  }

  // Look-ahead scheduler: every 100 ms, schedule the notes of the next ~0.4 s.
  const timer = setInterval(() => {
    if (ctx.state !== 'running') { nextT = Math.max(nextT, ctx.currentTime + 0.1); return; }
    while (nextT < ctx.currentTime + 0.4) { schedule(nextT, n); nextT += step; n++; }
  }, 100);
  return {
    stop() {
      clearInterval(timer);
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (battle ? 1.2 : 1.8));
      setTimeout(() => { try { gain.disconnect(); } catch (e) { /* already gone */ } }, 2600);
    },
  };
}

/** Play a region's music: region = 'academy' | 'number' | 'patterns' | 'shape' | 'stats'; mode = 'explore' | 'battle'. */
export function playMusic(region, mode = 'explore') {
  const key = `${THEMES[region] ? region : 'academy'}:${mode}`;
  wanted = key;
  if (current?.key === key) return;
  current?.track?.stop();
  current = null;
  const track = startTrack(key);
  if (track) current = { key, track };
}
export function stopMusic() {
  wanted = null;
  current?.track?.stop();
  current = null;
}
// Audio can only start after the first tap: begin whatever should be playing once it unlocks.
onAudioUnlock(() => { if (wanted && !current) { const w = wanted.split(':'); playMusic(w[0], w[1]); } });

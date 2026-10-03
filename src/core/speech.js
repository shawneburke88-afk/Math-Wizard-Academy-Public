// Read-aloud using the iPad's built-in voices (Web Speech API).
// iPadOS only allows speech after a user tap, so the first speak() happens from a tap handler.

let voice = null;
let enabled = true;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  const prefer = ['en-CA', 'en-US', 'en-GB', 'en-AU'];
  for (const lang of prefer) {
    const v = voices.find((x) => x.lang === lang && /Samantha|Karen|Moira|Tessa|Google|Natural|Enhanced|Premium/i.test(x.name)) ||
      voices.find((x) => x.lang === lang);
    if (v) return v;
  }
  return voices.find((x) => /^en/.test(x.lang)) || null;
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
  voice = pickVoice();
}

export const speechAvailable = () => 'speechSynthesis' in window;
export function setSpeechEnabled(v) { enabled = v; if (!v) stop(); }

/** Convert math symbols and fraction tokens into words for the voice. */
export function toSpoken(text) {
  return String(text || '')
    .replace(/\[\[f:(\d+) (\d+)\/(\d+)\]\]/g, '$1 and $2 over $3')
    .replace(/\[\[f:(\d+)\/(\d+)\]\]/g, '$1 over $2')
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ').replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2')
    .replace(/\+/g, ' plus ').replace(/=/g, ' equals ').replace(/□|\?\?+/g, ' what number ').replace(/</g, ' is less than ').replace(/>/g, ' is greater than ')
    .replace(/(\d) (\d{3})/g, '$1$2')
    .replace(/(\d)\s*¢/g, (m, d) => `${d} ${d === '1' ? 'cent' : 'cents'}`).replace(/¢/g, ' cents')
    .replace(/\s+/g, ' ').trim();
}

export function speak(text, { rate = 0.95, interrupt = true } = {}) {
  if (!enabled || !speechAvailable() || !text) return;
  try {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(toSpoken(text));
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-CA';
    u.rate = rate;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

export function stop() {
  try { if (speechAvailable()) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

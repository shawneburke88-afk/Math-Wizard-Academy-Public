// Mental math sprint: answer as many quick facts as you can before the timer runs out.
// A wrong answer costs a few seconds (so guessing fast doesn't pay). Used by the mental math chests.
import { h, svgEl, sleep } from './dom.js';
import { mentalChestSVG } from '../art/items.js';
import { speak, stop } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { sprintQuestion, thresholds, tierFor, TIERS, WRONG_PENALTY } from '../content/mentalmath.js';

/**
 * Runs a sprint. Resolves { correct, wrong, tier, thresholds } (tier −1 = below Bronze).
 * opts: { grade, level (1|2 area level, 0 = town), zone, seconds, best, autoRead }
 */
export function runSprint(opts) {
  const { grade, level = 1, zone = 'number', seconds = 20, best = 0, autoRead = false } = opts;
  const th = thresholds(grade, seconds);
  const root = h('div.sprint');
  document.getElementById('ui').appendChild(root);

  return new Promise((resolve) => {
    // ---- intro ----
    const tierRow = h('div.sprint-tiers', ...TIERS.map((t, i) => h('div.sprint-tier', h('div.icon', t.icon), h('b', `${th[i]}+`), h('span', t.name))));
    root.replaceChildren(h('div.sprint-card',
      svgEl(mentalChestSVG('ready'), 'sprint-chest'),
      h('h2', '⏱ Mental Math Chest'),
      h('p', `Answer as many as you can in `, h('b', `${seconds} seconds`), '! Do them in your head.'),
      h('p.sprint-warn', `A wrong answer costs ${WRONG_PENALTY} seconds, so think before you tap.`),
      tierRow,
      best ? h('p.muted', `Your best on this chest: ${best}`) : null,
      h('div.row', { style: { justifyContent: 'center', gap: '10px' } },
        h('button.btn.secondary', { onclick: () => { stop(); root.remove(); resolve(null); } }, 'Not now'),
        h('button.btn.green', { onclick: () => countdown() }, 'Start! ⚡'))));
    if (autoRead) speak(`Mental math chest! Answer as many as you can in ${seconds} seconds. A wrong answer costs ${WRONG_PENALTY} seconds.`);

    async function countdown() {
      stop();
      for (const n of ['3', '2', '1']) {
        root.replaceChildren(h('div.sprint-count', n));
        sfx.tap();
        await sleep(600);
      }
      play();
    }

    // ---- the sprint ----
    function play() {
      let correct = 0, wrong = 0, level2 = Math.max(1, level), streak = 0, left = seconds * 1000, over = false, q = null, entry = '';
      let last = performance.now();
      const bar = h('i');
      const timeTxt = h('b', String(seconds));
      const scoreTxt = h('b', '0');
      const qText = h('div.sprint-q');
      const answerArea = h('div.sprint-answers');
      const flash = h('div.sprint-flash');
      const medal = h('span.sprint-medal');
      root.replaceChildren(h('div.sprint-card.play',
        h('div.sprint-top', h('div.sprint-time', '⏱ ', timeTxt, 's'), h('div.sprint-score', '✔ ', scoreTxt, ' ', medal)),
        h('div.sprint-bar', bar),
        qText, answerArea, flash));

      const next = () => {
        // Starts at warm-up (town and areas 1–2) or core (areas 3–4) and steps up every 3 right answers.
        level2 = Math.min(3, Math.max(1, level) + Math.floor(correct / 3));
        q = sprintQuestion(grade, Math.min(3, level2), zone);
        window.__mwaSprintQ = q;   // test hook
        qText.textContent = q.prompt;
        entry = '';
        if (autoRead && grade <= 2) speak(q.speak);
        if (q.kind === 'mc') {
          answerArea.replaceChildren(h('div.sprint-choices', ...q.choices.map((c, i) => h('button.sprint-choice', { onclick: () => answer(i === q.answer) }, c))));
        } else {
          const disp = h('div.sprint-display', ' ');
          const set = (v) => { entry = v.slice(0, 8); disp.textContent = entry || ' '; };
          const key = (k) => h('button', { onclick: () => { if (!over) set(entry + k); } }, k);
          answerArea.replaceChildren(disp, h('div.keypad.sprint-keypad',
            ...['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(key),
            h('button', { onclick: () => { if (!over) set(entry.slice(0, -1)); }, 'aria-label': 'Delete' }, '⌫'),
            key('0'),
            q.needsDot ? key('.') : h('button', { style: { visibility: 'hidden' } }, ''),
            h('button.go', { style: { gridColumn: 'span 3' }, onclick: () => { if (!over && entry) answer(Number(entry) === Number(q.answer)); } }, 'Check ✓')));
        }
      };
      const show = (cls, text) => { flash.className = 'sprint-flash ' + cls; flash.textContent = text; void flash.offsetWidth; flash.classList.add('on'); };
      const answer = (ok) => {
        if (over) return;
        if (ok) { correct++; streak++; sfx.correct(); show('right', '+1'); }
        else { wrong++; streak = 0; left -= WRONG_PENALTY * 1000; sfx.wrong(); show('wrong', `−${WRONG_PENALTY}s`); root.querySelector('.sprint-card')?.classList.add('shake'); setTimeout(() => root.querySelector('.sprint-card')?.classList.remove('shake'), 350); }
        scoreTxt.textContent = String(correct);
        const t = tierFor(correct, th);
        medal.textContent = t >= 0 ? TIERS[t].icon : '';
        next();
      };
      let lastTick = Math.ceil(left / 1000);
      const loop = () => {
        if (over) return;
        const now = performance.now();
        left -= now - last; last = now;
        const secs = Math.max(0, Math.ceil(left / 1000));
        timeTxt.textContent = String(secs);
        bar.style.width = `${Math.max(0, (left / (seconds * 1000)) * 100)}%`;
        bar.className = left < 5000 ? 'low' : '';
        if (secs !== lastTick && secs <= 5 && secs > 0) sfx.tap();
        lastTick = secs;
        if (left <= 0) { finish(); return; }
        requestAnimationFrame(loop);
      };
      const finish = async () => {
        over = true;
        stop();
        sfx.encounter();
        answerArea.replaceChildren();
        qText.textContent = '⏰ Time!';
        await sleep(900);
        root.remove();
        resolve({ correct, wrong, tier: tierFor(correct, th), thresholds: th });
      };
      next();
      requestAnimationFrame(loop);
    }
  });
}

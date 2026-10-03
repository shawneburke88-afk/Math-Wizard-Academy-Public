// The question panel: prompt, visual model, answer choices or number keypad, hint, and explanation.
import { h, svgEl, sleep } from './dom.js';
import { renderVisual, renderRichText } from '../art/visuals.js';
import { speak, stop } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { isCorrect } from '../content/curriculum.js';
import { tip } from './tutorial.js';
import { track } from '../core/telemetry.js';
import { noteAnswer, getActiveProfile } from '../game/progress.js';

const rich = (s) => h('span', { html: renderRichText(String(s ?? '')) });
const visual = (v, size) => (v ? svgEl(renderVisual(v, size), 'qvisual') : null);

/**
 * Show a question. Resolves { correct, hinted, response }.
 * opts: { autoRead, title, badge: 'challenge' | 'trial' | null, container }
 */
export function askQuestion(qinfo, opts = {}) {
  const { q, skill, tier, mode } = qinfo;
  window.__mwaQuestion = q;   // test hooks (tools/test-befriend.mjs, tools/playthrough.mjs)
  window.__mwaQInfo = { tier, mode, skill: skill?.id };
  const t0 = performance.now();
  return new Promise((resolve0) => {
    // Record every answer for balancing (skill, tier, right/wrong, hint, second try, seconds taken).
    const resolve = (r) => {
      try {
        const ms = Math.round(performance.now() - t0);
        track('answer', { skill: skill?.id, tier, mode, kind: q.kind || 'mc', ok: !!r.correct, hint: !!r.hinted, second: !!r.secondTry, ms, lesson: !!opts.noLessonLink });
        noteAnswer(getActiveProfile(), { skillId: skill?.id, kind: q.kind || 'mc', picture: !!q.visual, ok: !!r.correct, second: !!r.secondTry, ms });
      } catch (e) { /* never block play */ }
      resolve0(r);
    };
    let hinted = false;
    let answered = false;
    let tries = 0;               // opts.retry: one wrong answer reveals the hint and allows a second try
    let resetEntry = null;
    const container = opts.container || document.getElementById('ui');
    const speakText = q.speak || q.prompt;

    const hintArea = h('div');
    const explainArea = h('div');
    const tierBadge = mode === 'challenge' ? h('span.qtier.challenge', '★ Challenge') : mode === 'trial' ? h('span.qtier.challenge', '✦ Evolution Trial') : h('span.qtier', `Tier ${tier}`);
    const speakBtn = h('button.speak-btn', { onclick: () => speak(speakText), 'aria-label': 'Read aloud' }, '🔊');

    const finish = async (correct, response, choiceEls) => {
      if (answered) return;
      answered = true;
      stop();
      const kp = card.querySelector('.kp-display');
      if (!correct && opts.retry && tries === 0) {
        // First miss: show the hint and let them try the same question again.
        tries = 1;
        answered = false;
        sfx.wrong();
        wrap.appendChild(h('div.qstamp.wrong.brief', h('div.qstamp-mark', '✗'), h('div.qstamp-text', 'Try again!')));
        if (choiceEls) { choiceEls[response]?.classList.add('wrong', 'dim'); if (choiceEls[response]) choiceEls[response].disabled = true; }
        if (kp) { kp.classList.add('wrong'); resetEntry?.(); }
        revealHint();
        explainArea.replaceChildren(h('div.explain-box.retry', '💡 Read the hint and try again. ', h('b', opts.retryNote || 'A right answer now works at half strength.')));
        if (opts.autoRead) speak('Not quite. Read the hint and try again.');
        setTimeout(() => hintArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 600);
        return;
      }
      if (correct) {
        sfx.correct();
        if (choiceEls) {
          choiceEls[response]?.classList.add('right');
          choiceEls.forEach((c, i) => { if (i !== response) c.classList.add('dim'); });
        }
        kp?.classList.add('right');
        const praise = pick(PRAISE);
        // A big stamp over the card, so the result is visible even when the card is scrolled.
        const stamp = h('div.qstamp.right', h('div.qstamp-mark', '✔'), h('div.qstamp-text', praise));
        wrap.appendChild(stamp);
        explainArea.replaceChildren(h('div.explain-box', '✔ ', praise));
        if (opts.autoRead) speak(praise);
        // Tap anywhere to continue sooner.
        await Promise.race([sleep(1400), new Promise((r) => wrap.addEventListener('pointerdown', r, { once: true }))]);
        close();
        resolve({ correct: true, hinted, response, secondTry: tries > 0 });
      } else if (opts.noExplain) {
        // The caller shows its own walkthrough (Teaching Moment practice).
        sfx.wrong();
        kp?.classList.add('wrong');
        if (choiceEls) choiceEls[response]?.classList.add('wrong');
        wrap.appendChild(h('div.qstamp.wrong.brief', h('div.qstamp-mark', '✗'), h('div.qstamp-text', 'Let’s look at it')));
        await sleep(1300);
        close();
        resolve({ correct: false, hinted, response });
      } else {
        sfx.wrong();
        kp?.classList.add('wrong');
        wrap.appendChild(h('div.qstamp.wrong.brief', h('div.qstamp-mark', '✗'), h('div.qstamp-text', 'Not quite')));
        if (choiceEls) {
          choiceEls[response]?.classList.add('wrong');
          choiceEls[q.answer]?.classList.add('right');
          choiceEls.forEach((c, i) => { if (i !== response && i !== q.answer) c.classList.add('dim'); });
        }
        const answerText = (q.kind || 'mc') === 'num' ? String(q.answer) : null;
        explainArea.replaceChildren(h('div.explain-box.wrong',
          h('div', h('b', 'Not quite. '), answerText ? h('span', 'The answer is ', h('b', answerText), '. ') : null),
          h('div', rich(q.explain)),
          visual(q.explainVisual, { maxWidth: 520, maxHeight: 220 }),
          h('div.qtools', h('button.speak-btn', { onclick: () => speak(q.explain) }, '🔊'),
            h('button.btn.green', { onclick: () => { stop(); close(); resolve({ correct: false, hinted, response }); } }, 'Got it!'))));
        if (opts.autoRead) speak('Not quite. ' + q.explain);
        setTimeout(() => explainArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 700);
        if (opts.profile) tip(opts.profile, 'wrong');
      }
    };

    // Answer area
    let answerArea;
    let choiceEls = null;
    if ((q.kind || 'mc') === 'num') {
      let value = '';
      const display = h('div.kp-display', ' ');
      const set = (v) => { value = v.slice(0, 10); display.textContent = value || ' '; };
      resetEntry = () => setTimeout(() => { set(''); display.classList.remove('wrong'); }, 700);
      const key = (k) => h('button', { onclick: () => { sfx.tap(); if (answered) return; set(value + k); } }, k);
      const needsMinus = String(q.answer).startsWith('-');
      answerArea = h('div', display, h('div.keypad',
        ...['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(key),
        needsMinus ? h('button', { onclick: () => { if (!answered) set(value.startsWith('-') ? value.slice(1) : '-' + value); } }, '±') : key('.'),
        key('0'),
        h('button', { onclick: () => { if (!answered) set(value.slice(0, -1)); }, 'aria-label': 'Delete' }, '⌫'),
        h('button.go', { style: { gridColumn: 'span 3' }, onclick: () => { if (value && !answered) finish(isCorrect(q, value), value); } }, 'Check ✓')));
    } else {
      const hasVisualChoices = q.choices.some((c) => typeof c === 'object');
      choiceEls = q.choices.map((c, i) => h('button.qchoice', {
        onclick: () => finish(isCorrect(q, i), i, choiceEls),
        'aria-label': typeof c === 'string' ? c : c.label || `choice ${i + 1}`,
      }, typeof c === 'string' ? rich(c) : svgEl(renderVisual(c.visual, { maxWidth: 240, maxHeight: 160 }))));
      answerArea = h('div.qchoices', { style: hasVisualChoices || q.choices.length === 3 ? { gridTemplateColumns: `repeat(${Math.min(q.choices.length, hasVisualChoices ? 2 : 3)}, 1fr)` } : {} }, choiceEls);
    }

    const revealHint = () => {
      if (hinted) return;
      hinted = true;
      hintBtn.disabled = true;
      // Still stuck after the hint? Jump into a Teaching Moment for this skill, then come back to this question.
      const lessonLink = opts.profile && !opts.noLessonLink && skill?.id
        ? h('div.hint-lesson', h('button.btn.small.purple', {
          onclick: async (e) => {
            const b = e.currentTarget;
            b.disabled = true; stop();
            const { teachingMoment } = await import('./lesson.js');
            await teachingMoment(opts.profile, skill.id, { autoRead: opts.autoRead, overQuestion: true });
            b.disabled = false;
          },
        }, '🎓 Still stuck? Go to Teaching Moment')) : null;
      hintArea.replaceChildren(h('div.hint-box', '💡 ', rich(q.hint), visual(q.hintVisual, { maxWidth: 520, maxHeight: 220 }), lessonLink));
      if (opts.autoRead || opts.readHints) speak(q.hint);
    };
    const hintBtn = h('button.btn.secondary.small', {
      onclick: () => { if (!answered) revealHint(); },
    }, mode === 'challenge' ? '💡 Hint (lowers reward)' : '💡 Hint');

    const card = h('div.qcard',
      h('div.qhead', h('div.qskill', opts.title || skill.name), tierBadge, speakBtn),
      h('div.qprompt', rich(q.prompt)),
      visual(q.visual, { maxWidth: 640, maxHeight: 300 }),
      answerArea,
      hintArea,
      h('div.qtools', hintBtn),
      explainArea);
    const wrap = h('div.qwrap', card);
    container.appendChild(wrap);
    const close = () => wrap.remove();
    if (opts.profile) {
      (async () => {
        await tip(opts.profile, 'question');
        if ((q.kind || 'mc') === 'num') await tip(opts.profile, 'keypad');
        if (mode === 'challenge') await tip(opts.profile, 'challengeQ');
      })();
    }
    if (opts.autoRead) setTimeout(() => speak(speakText), 250);
  });
}

const PRAISE = ['Great thinking!', 'You got it!', 'Brilliant!', 'Spell-tacular!', 'Nice work!', 'Correct!', 'Wizard-level answer!', 'Awesome!'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

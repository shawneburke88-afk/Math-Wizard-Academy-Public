// Teaching Moment: when a kid is struggling with a skill, Hoot teaches it. Not optional once triggered.
// 1) What it's about, strategies with pictures and a worked example. 2) Three practice questions; a wrong
// answer gets a step-by-step walkthrough of that same question.
import { h, svgEl, sleep, modal } from './dom.js';
import { renderVisual, renderRichText } from '../art/visuals.js';
import { creatureSVG } from '../art/creatures.js';
import { speak, stop } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { persist } from '../core/save.js';
import { getSkill, makeQuestion, skillsFor, STRANDS } from '../content/curriculum.js';
import { LESSONS } from '../content/lessons.js';
import { skillState, struggling } from '../core/adaptive.js';
import { askQuestion } from './question.js';
import { track } from '../core/telemetry.js';

const rich = (s) => h('span', { html: renderRichText(String(s ?? '')) });
const visual = (v, size = { maxWidth: 520, maxHeight: 220 }) => {
  if (!v) return null;
  try { return svgEl(renderVisual(v, size), 'qvisual'); } catch (e) { console.warn('[lesson] visual failed', e); return null; }
};
const PRACTICE = 3;
// When a Teaching Moment can fire [TUNABLE]: once per skill per day, and at most one every 15 minutes.
const PER_SKILL_MS = 20 * 60 * 60 * 1000;
const GAP_MS = 15 * 60 * 1000;

/** Call after each answer. Queues a Teaching Moment if the kid is struggling with this skill (shown after the battle). */
export function checkStruggle(profile, skillId) {
  if (!struggling(profile, skillId)) return false;
  const log = (profile.lessons ||= { last: 0, bySkill: {} });
  const now = Date.now();
  if (now - (log.bySkill[skillId] || 0) < PER_SKILL_MS || now - log.last < GAP_MS) return false;
  if (profile.pendingLesson) return false;
  profile.pendingLesson = skillId;
  persist();
  return true;
}

/** Shows the queued Teaching Moment, if any. */
export async function runPendingLesson(profile, { autoRead = false } = {}) {
  const id = profile.pendingLesson;
  if (!id) return;
  profile.pendingLesson = null;
  const log = (profile.lessons ||= { last: 0, bySkill: {} });
  log.last = log.bySkill[id] = Date.now();
  persist();
  await teachingMoment(profile, id, { autoRead });
}

export async function teachingMoment(profile, skillId, { autoRead = false, overQuestion = false, fromAcademy = false } = {}) {
  const skill = getSkill(skillId);
  if (!skill) return;
  // Any Teaching Moment (asked for or triggered) counts, so Hoot doesn't pop the same one up again right away.
  const log = (profile.lessons ||= { last: 0, bySkill: {} });
  log.bySkill[skillId] = Date.now();
  if (profile.pendingLesson === skillId) profile.pendingLesson = null;
  persist();
  const L = LESSONS[skillId] || fallbackLesson(skill);
  const tier = skillState(profile, skillId).tier;
  const root = h('div.lesson' + (overQuestion ? '.top' : ''));
  document.getElementById('ui').appendChild(root);
  const say = (t) => { if (autoRead) speak(t); };

  // ---- Page 1: learn ----
  await new Promise((resolve) => {
    const ex = makeQuestion(profile, { skillId, tierOverride: Math.max(1, tier - 1), mode: 'trial' }).q;
    const exAnswer = (ex.kind || 'mc') === 'num' ? String(ex.answer) : typeof ex.choices?.[ex.answer] === 'string' ? ex.choices[ex.answer] : null;
    const speakBtn = (t) => h('button.speak-btn', { onclick: () => speak(t), 'aria-label': 'Read aloud' }, '🔊');
    root.replaceChildren(h('div.lesson-card',
      h('div.lesson-head', svgEl(creatureSVG('percenta', 1, { mood: 'happy' }), 'lesson-owl'),
        h('div', h('div.lesson-kicker', '✦ Teaching Moment'), h('h2', skill.name), h('p.muted', 'Hoot noticed this one is tricky. Let’s learn it together, then practise!'))),
      h('section.lesson-sec', h('h3', 'What is it about? ', speakBtn(L.intro)), h('p', rich(L.intro)), visual(L.introVisual)),
      h('section.lesson-sec', h('h3', 'Strategies to try'),
        h('div.lesson-strats', ...L.strategies.map((s, i) => h('div.lesson-strat',
          h('div.lesson-strat-title', h('span.num', i + 1), s.title, speakBtn(`${s.title}. ${s.text}`)),
          h('p', rich(s.text)), visual(s.visual, { maxWidth: 420, maxHeight: 180 }))))),
      h('section.lesson-sec', h('h3', 'Example'),
        h('div.lesson-example',
          h('p.lesson-q', rich(ex.prompt)), visual(ex.visual || ex.hintVisual, { maxWidth: 480, maxHeight: 200 }),
          exAnswer ? h('p', h('b', 'Answer: '), rich(exAnswer)) : null,
          h('p', h('b', 'How: '), rich(ex.explain), ' ', speakBtn(ex.explain)), visual(ex.explainVisual, { maxWidth: 480, maxHeight: 200 }))),
      h('div.center', h('button.btn.green', { onclick: () => { stop(); resolve(); } }, `Practise ${PRACTICE} questions →`))));
    say(`Teaching Moment. ${skill.name}. ${L.intro}`);
  });

  // ---- Page 2: practice, with a walkthrough for any wrong answer ----
  let right = 0;
  for (let i = 0; i < PRACTICE; i++) {
    root.replaceChildren(h('div.lesson-card.lesson-bg'));
    const qi = makeQuestion(profile, { skillId, tierOverride: Math.max(1, tier), mode: 'trial' });
    const res = await askQuestion(qi, { container: root, autoRead, title: `Teaching Moment · Practice ${i + 1} of ${PRACTICE}`, noExplain: true, noLessonLink: true });
    if (res.correct) { right++; continue; }
    await walkthrough(root, qi.q, res.response, { autoRead });
  }

  // ---- Done ----
  track('lesson', { skill: skillId, tier, right, of: PRACTICE, from: overQuestion ? 'hint' : 'lesson' });
  (profile.lessonLog ||= []).push({ t: Date.now(), skill: skillId, tier, right, of: PRACTICE, from: overQuestion ? 'hint' : fromAcademy ? 'academy' : 'hoot' });
  if (profile.lessonLog.length > 50) profile.lessonLog.splice(0, profile.lessonLog.length - 50);
  persist();
  sfx.levelUp();
  await new Promise((resolve) => {
    root.replaceChildren(h('div.lesson-card.lesson-done',
      svgEl(creatureSVG('percenta', 2, { mood: 'happy' }), 'lesson-owl big'),
      h('h2', 'Great learning!'),
      h('p', `You practised ${skill.name} and got ${right} of ${PRACTICE} right. ${right === PRACTICE ? 'You’ve got this!' : 'Keep using those strategies. You’re getting stronger every time!'}`),
      h('button.btn.green', { onclick: () => { stop(); resolve(); } }, overQuestion ? 'Back to my question ✦' : 'Back to the adventure ✦')));
    say(`Great learning! You got ${right} of ${PRACTICE} right.`);
  });
  root.remove();
}

/** Step-by-step walkthrough of a question the kid got wrong: read it, think about it (hint), solve it, check it. */
async function walkthrough(root, q, response, { autoRead }) {
  const answerText = (q.kind || 'mc') === 'num' ? String(q.answer) : typeof q.choices?.[q.answer] === 'string' ? q.choices[q.answer] : null;
  const theirs = (q.kind || 'mc') === 'num' ? String(response) : typeof q.choices?.[response] === 'string' ? q.choices[response] : null;
  const steps = [
    { title: 'Step 1: Read it carefully', body: [h('p.lesson-q', rich(q.prompt)), visual(q.visual, { maxWidth: 480, maxHeight: 200 })], speak: q.speak || q.prompt },
    { title: 'Step 2: Think it through', body: [h('p', rich(q.hint)), visual(q.hintVisual, { maxWidth: 480, maxHeight: 200 })], speak: q.hint },
    { title: 'Step 3: Solve it', body: [h('p', rich(q.explain)), visual(q.explainVisual, { maxWidth: 480, maxHeight: 200 }), answerText ? h('p.lesson-answer', 'The answer is ', h('b', rich(answerText)), '.') : null], speak: q.explain },
  ];
  if (theirs && answerText) steps.push({ title: 'Step 4: Check', body: [h('p', 'You chose ', h('b', rich(theirs)), '. The answer is ', h('b', rich(answerText)), '. Look back at Step 3 to see why. Mistakes help your brain grow!')], speak: `You chose ${theirs}. The answer is ${answerText}.` });
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await new Promise((resolve) => {
      root.replaceChildren(h('div.lesson-card',
        h('div.lesson-head', svgEl(creatureSVG('percenta', 1, { mood: 'idle' }), 'lesson-owl'),
          h('div', h('div.lesson-kicker', '✦ Let’s walk through it'), h('div.lesson-steps', ...steps.map((_, j) => h('span' + (j <= i ? '.on' : ''))))) ),
        // Earlier steps stay visible above the newest one.
        ...steps.slice(0, i + 1).map((st, j) => h('section.lesson-sec' + (j === i ? '.now' : '.past'), h('h3', st.title, ' ', h('button.speak-btn', { onclick: () => speak(st.speak) }, '🔊')), ...st.body.map((n) => (n && j < i ? n.cloneNode(true) : n)))),
        h('div.center', h('button.btn.green', { onclick: () => { stop(); resolve(); } }, i < steps.length - 1 ? 'Next step →' : 'Got it! Next question →'))));
      root.querySelector('.lesson-sec.now')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (autoRead) speak(s.speak);
    });
    await sleep(50);
  }
}

/** If a skill has no written lesson yet: build one from its description and hint style. */
function fallbackLesson(skill) {
  return {
    intro: skill.parentDesc || `This is about ${skill.name}.`,
    strategies: [
      { title: 'Read slowly', text: 'Read the whole question. What is it asking you to find?' },
      { title: 'Use a picture', text: 'Draw it, count it, or use the picture to help you think.' },
      { title: 'Check your answer', text: 'Does your answer make sense? Try it a different way to check.' },
    ],
  };
}

/** The Academy: kids pick any skill from their grade and Hoot teaches it (a self-started Teaching Moment). */
export function openAcademy(profile, { autoRead = false } = {}) {
  const m = modal('🎓 Academy');
  const render = () => {
    const skills = skillsFor(profile);
    const tierOf = (s) => skillState(profile, s.id).tier;
    const pips = (t) => h('span.acad-pips', ...[1, 2, 3, 4, 5].map((i) => h('i' + (i <= t ? '.on' : ''))));
    const card = (s) => h('div.acad-skill',
      h('div', h('div.acad-name', s.name), h('div.acad-sub', pips(tierOf(s)), ` Tier ${tierOf(s)}`, struggling(profile, s.id) ? h('span.acad-flag', ' · tricky right now') : null)),
      h('button.btn.small.green', { onclick: async () => { await teachingMoment(profile, s.id, { autoRead, fromAcademy: true }); render(); } }, 'Learn ✦'));
    const tricky = skills.filter((s) => struggling(profile, s.id));
    const recommended = (tricky.length ? tricky : [...skills].sort((a, b) => tierOf(a) - tierOf(b)).slice(0, 2)).slice(0, 3);
    const strands = [...new Set(skills.map((s) => s.strand))];
    m.body.replaceChildren(
      h('div.acad-intro', svgEl(creatureSVG('percenta', 2, { mood: 'happy' }), 'lesson-owl'),
        h('div', h('p', h('b', 'Welcome to the Academy! '), 'Pick anything you’d like to learn more about. Hoot will explain it, show you some strategies, and help you practise.'))),
      h('h3', '🦉 Hoot recommends'),
      h('div.acad-list', ...recommended.map(card)),
      ...strands.flatMap((st) => [h('h3', STRANDS[st]?.name || st), h('div.acad-list', ...skills.filter((s) => s.strand === st).map(card))]));
    if (autoRead) speak('Welcome to the Academy! Pick anything you would like to learn more about.');
  };
  render();
  return m;
}

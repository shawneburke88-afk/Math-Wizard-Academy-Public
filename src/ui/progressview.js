// Grown-ups ▸ Progress: how a kid is doing, from their saved stats. Summary cards, 14-day activity, a bar per strand
// (tap one to drill into its big ideas and skills), skills that need attention, question formats, Teaching Moments
// and mental math. Bars show how many questions were answered; the success rate is written beside each bar with a
// status chip (icon + word, never colour alone).
import { h } from './dom.js';
import { ALL_SKILLS, STRANDS, BIG_IDEAS, strandCap } from '../content/curriculum.js';
import { struggling, enforceCaps } from '../core/adaptive.js';
import { persist } from '../core/save.js';

// Success-rate bands [TUNABLE] and their status colours (see styles: .st-good / .st-ok / .st-low / .st-alert).
const band = (pct) => (pct == null ? null : pct >= 85 ? { cls: 'good', icon: '✓', word: 'Strong' } : pct >= 70 ? { cls: 'ok', icon: '●', word: 'Okay' } : { cls: 'low', icon: '▲', word: 'Practise' });
const chip = (pct) => { const b = band(pct); return b ? h('span.st-chip.st-' + b.cls, `${b.icon} ${b.word}`) : h('span.st-chip.st-none', 'No data'); };
const pctOf = (ok, n) => (n ? Math.round((ok / n) * 100) : null);
const ago = (t) => { if (!t) return 'never'; const d = Math.floor((Date.now() - t) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d} days ago` : 'over a month ago'; };
const dayKey = (t) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Stats for one skill from the saved ladder state. recent = answers at the current tier (a hint counts half). */
function skillStats(p, s) {
  const st = p.skills[s.id];
  if (!st?.total) return { s, n: 0 };
  const hist = st.hist || [];
  return {
    s, n: st.total, pct: pctOf(st.correct, st.total), tier: st.tier || 1, mastered: !!st.mastered,
    recent: hist.length >= 3 ? Math.round((hist.reduce((a, x) => a + x, 0) / hist.length) * 100) : null, recentN: hist.length,
    hintPct: pctOf(st.hints || 0, st.total), secondPct: pctOf(st.second || 0, st.total),
    secs: st.timed ? (st.ms / st.timed / 1000) : null, last: st.last, drops: st.drops || 0, struggling: struggling(p, s.id),
  };
}
function groupStats(list) {
  const n = list.reduce((a, x) => a + x.n, 0), ok = list.reduce((a, x) => a + (x.n ? x.pct * x.n / 100 : 0), 0);
  const started = list.filter((x) => x.n);
  return { n, pct: n ? Math.round((ok / n) * 100) : null, tier: started.length ? started.reduce((a, x) => a + x.tier, 0) / started.length : null, count: list.length, started: started.length };
}

/** A labelled bar: length = questions answered (vs the biggest in the group), then the success rate and a chip. */
function barRow({ label, sub, n, max, pct, tier, onclick }) {
  const w = max ? Math.max(n ? 3 : 0, (n / max) * 100) : 0;
  return h('button.pv-bar' + (onclick ? '.tap' : ''), { onclick, disabled: !onclick, title: `${label}: ${n} questions${pct != null ? `, ${pct}% right` : ''}` },
    h('div.pv-bar-label', h('b', label), sub ? h('small', sub) : null),
    h('div.pv-bar-track', h('i', { style: { width: w + '%' } })),
    h('div.pv-bar-num', h('b', String(n)), h('small', 'questions')),
    h('div.pv-bar-pct', h('b', pct != null ? pct + '%' : '—'), chip(pct)),
    h('div.pv-bar-tier', tier != null ? `Tier ${tier.toFixed(1)}` : ''),
    onclick ? h('div.pv-chev', '›') : null);
}

/** The 14-day activity chart: a column per day (questions answered); tap/hover a day for details. */
function activityChart(p) {
  const days = [];
  for (let i = 13; i >= 0; i--) { const t = Date.now() - i * 86400000; const k = dayKey(t); days.push({ k, t, d: p.daily?.[k] || { q: 0, ok: 0, play: 0 } }); }
  const max = Math.max(10, ...days.map((x) => x.d.q));
  const info = h('div.pv-act-info', 'Tap a day for details.');
  const show = (x) => { const pct = pctOf(x.d.ok, x.d.q); info.textContent = `${new Date(x.t).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}: ${x.d.q} questions${pct != null ? `, ${pct}% right first try` : ''}, ${Math.round(x.d.play)} min played`; };
  const cols = days.map((x) => h('button.pv-col', { onmouseenter: () => show(x), onclick: () => show(x), 'aria-label': `${x.k}: ${x.d.q} questions` },
    h('div.pv-col-bar', h('i', { style: { height: (x.d.q / max) * 100 + '%' } })),
    h('small', new Date(x.t).toLocaleDateString([], { weekday: 'narrow' }))));
  const week = days.slice(7), q7 = week.reduce((a, x) => a + x.d.q, 0), ok7 = week.reduce((a, x) => a + x.d.ok, 0), m7 = week.reduce((a, x) => a + x.d.play, 0);
  const tracked = Object.keys(p.daily || {}).length;
  return h('div',
    h('div.pv-act', ...cols),
    info,
    h('p.muted', `Last 7 days: ${q7} questions, ${pctOf(ok7, q7) ?? '—'}${q7 ? '%' : ''} right first try, ${Math.round(m7)} minutes played.${tracked < 14 ? ' (Daily tracking started recently, so earlier days are empty.)' : ''}`));
}

/** The whole Progress view for kid p. state = { strand } (which strand is open); rerender redraws. */
export function progressView(p, state, rerender) {
  enforceCaps(p);
  const skills = ALL_SKILLS.filter((s) => s.grade === p.grade);
  const stats = skills.map((s) => skillStats(p, s));
  const all = groupStats(stats);
  const onTrack = stats.filter((x) => x.mastered || (x.tier || 0) >= 3).length;
  const needs = stats.filter((x) => x.n >= 8 && (x.struggling || (x.recent != null && x.recent < 70) || x.pct < 65))
    .sort((a, b) => (a.recent ?? a.pct) - (b.recent ?? b.pct)).slice(0, 5);
  const great = stats.filter((x) => x.n >= 10 && (x.recent ?? x.pct) >= 90 && !x.struggling).sort((a, b) => b.tier - a.tier || b.n - a.n).slice(0, 4);
  const focus = new Set(p.settings.focusSkills || []);
  const toggleFocus = (id) => { const f = p.settings.focusSkills || []; p.settings.focusSkills = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; persist(); rerender(); };

  const skillCard = (x) => h('div.pv-skill' + (x.n ? '' : '.none'),
    h('div.pv-skill-top',
      h('div', h('b', x.s.name), x.s.classic ? h('span.pill.pv-small', 'Classic') : null, x.mastered ? h('span.pill.pv-small', '★ mastered') : null, x.struggling ? h('span.st-chip.st-alert', '⚠ struggling now') : null),
      h('button.btn.small' + (focus.has(x.s.id) ? '.green' : '.secondary'), { onclick: () => toggleFocus(x.s.id) }, focus.has(x.s.id) ? '✓ Practising more' : 'Practise more')),
    h('div.pv-skill-desc', x.s.parentDesc || ''),
    x.n ? h('div.pv-skill-stats',
      h('div', h('small', 'Tier'), h('span.tiers' + (x.mastered ? '.mastered' : ''), ...[1, 2, 3, 4, 5].map((t) => h('i' + (t <= x.tier ? '.on' : '')))), x.tier >= 3 ? h('span.pv-ontrack', ' ✓ on track') : null),
      h('div', h('small', 'Answered'), h('b', String(x.n))),
      h('div', h('small', 'Right'), h('b', `${x.pct}%`), chip(x.pct)),
      h('div', h('small', 'At this tier'), h('b', x.recent != null ? `${x.recent}%` : '—'), h('small', x.recentN ? ` (last ${x.recentN})` : '')),
      h('div', h('small', 'Used a hint'), h('b', `${x.hintPct}%`)),
      h('div', h('small', 'Needed 2nd try'), h('b', x.secondPct != null && p.skills[x.s.id].second != null ? `${x.secondPct}%` : '—')),
      h('div', h('small', 'Avg time'), h('b', x.secs != null ? `${x.secs.toFixed(1)} s` : '—')),
      h('div', h('small', 'Last practised'), h('b', ago(x.last))),
      x.drops ? h('div', h('small', 'Dropped a tier'), h('b', `${x.drops}×`)) : null)
      : h('div.muted', 'Not practised yet.'));

  // ---- drill-down into one strand ----
  if (state.strand) {
    const sid = state.strand, st = STRANDS[sid];
    const ideas = Object.entries(BIG_IDEAS).filter(([, b]) => b.strand === sid).map(([bid, b]) => ({ bid, b, list: stats.filter((x) => x.s.bigIdea === bid) })).filter((g) => g.list.length);
    const extra = stats.filter((x) => x.s.strand === sid && !ideas.some((g) => g.bid === x.s.bigIdea));
    if (extra.length) ideas.push({ bid: 'other', b: { name: 'Other skills' }, list: extra });
    const maxN = Math.max(1, ...ideas.map((g) => groupStats(g.list).n));
    const cap = strandCap(p, sid);
    return h('div',
      h('section',
        h('div.row', { style: { justifyContent: 'space-between', alignItems: 'center' } }, h('h2', `${st.name}`), h('button.btn.secondary.small', { onclick: () => { state.strand = null; rerender({ top: true }); } }, '← All strands')),
        h('p.muted', `Tiers can reach ${cap} in this strand right now${cap < 5 ? ` (Tier ${cap + 1} opens when ${p.name} reaches area ${cap} of its region)` : ''}. Bars show questions answered; the percentage is how many were right.`),
        ...ideas.map((g) => { const gs = groupStats(g.list); return barRow({ label: g.b.name, sub: `${gs.started} of ${gs.count} skills started`, n: gs.n, max: maxN, pct: gs.pct, tier: gs.tier }); })),
      ...ideas.map((g) => h('section', h('h3', g.b.name), ...g.list.slice().sort((a, b) => (b.n > 0) - (a.n > 0) || (a.recent ?? a.pct ?? 101) - (b.recent ?? b.pct ?? 101)).map(skillCard))));
  }

  // ---- overview ----
  const strands = Object.entries(STRANDS).map(([sid, st]) => ({ sid, st, gs: groupStats(stats.filter((x) => x.s.strand === sid)) }));
  const maxS = Math.max(1, ...strands.map((x) => x.gs.n));
  const f = p.formats || {};
  const fmtRow = (label, r) => { const pct = pctOf(r?.ok || 0, r?.n || 0); return h('div.pv-fmt', h('b', label), h('span', `${r?.n || 0} questions`), h('b', pct != null ? pct + '%' : '—'), chip(pct)); };
  const lessons = (p.lessonLog || []).slice(-8).reverse();
  const nameOf = (id) => ALL_SKILLS.find((s) => s.id === id)?.name || id;
  const sprints = (p.sprintLog || []).slice(-12);
  const sMax = Math.max(5, ...sprints.map((x) => x.ok));
  const medal = (t) => ['', '🥉', '🥈', '🥇', '💎'][t] || '';

  return h('div',
    h('div.summary-stats',
      h('div', h('b', String(all.n)), 'questions answered'),
      h('div', h('b', all.pct != null ? all.pct + '%' : '—'), 'right overall'),
      h('div', h('b', `${onTrack}/${skills.length}`), 'skills on track (Tier 3+)'),
      h('div', h('b', String(needs.length)), 'need attention'),
      h('div', h('b', String(Math.round((p.stats.playMs || 0) / 60000))), 'minutes played')),
    h('section', h('h2', 'Activity (last 14 days)'), activityChart(p)),
    h('section', h('h2', 'By strand'), h('p.muted', 'Tap a strand to see its big ideas and every skill.'),
      ...strands.map((x) => barRow({ label: x.st.name, sub: `${x.gs.started} of ${x.gs.count} skills started`, n: x.gs.n, max: maxS, pct: x.gs.pct, tier: x.gs.tier, onclick: () => { state.strand = x.sid; rerender({ top: true }); } }))),
    h('section', h('h2', '⚠ Needs attention'),
      needs.length ? h('div', ...needs.map(skillCard)) : h('p.muted', all.n < 40 ? 'Not enough answers yet to tell. Check back after a few play sessions.' : 'Nothing stands out right now. 🎉')),
    great.length ? h('section', h('h2', '🌟 Going great'), h('div.pv-great', ...great.map((x) => h('div', h('b', x.s.name), h('small', `Tier ${x.tier} · ${x.recent ?? x.pct}% right recently`))))) : null,
    h('section', h('h2', 'Question formats'),
      h('p.muted', 'Right on the first try, by how the question was asked. A big gap can show where to help (e.g., fine with pictures, harder with numbers only).'),
      fmtRow('Multiple choice', f.choice), fmtRow('Typed answer', f.typed), fmtRow('With a picture', f.picture), fmtRow('Numbers and words only', f.noPicture),
      !(f.choice?.n || f.typed?.n) ? h('p.muted', 'Format tracking started recently; results appear as they play.') : null),
    h('section', h('h2', '🦉 Teaching Moments'),
      lessons.length ? h('div.pv-list', ...lessons.map((l) => h('div', h('b', nameOf(l.skill)), h('span', `${l.right} of ${l.of} practice right`), h('small', `${{ hoot: 'Hoot noticed a struggle', academy: 'Chose it in the Academy', hint: 'From a hint' }[l.from] || ''} · ${ago(l.t)}`))))
        : h('p.muted', 'No Teaching Moments yet. Hoot steps in when a skill gets tricky, and kids can pick any skill in the 🎓 Academy.')),
    h('section', h('h2', '⏱ Mental math'),
      sprints.length ? h('div',
        h('div.pv-act', ...sprints.map((x) => h('div.pv-col', { title: `${x.ok} right, ${x.wrong} wrong in ${x.secs} s` }, h('div.pv-col-bar', h('i', { style: { height: (x.ok / sMax) * 100 + '%' } })), h('small', medal(x.tier) || '·')))),
        h('p.muted', `Right answers per sprint (most recent on the right). Best: ${p.stats.sprintBest || 0} in ${p.settings.mentalTime || 20} seconds. Sprints this week: ${sprints.filter((x) => Date.now() - x.t < 7 * 86400000).length}.`))
        : h('p.muted', p.stats.sprints ? `${p.stats.sprints} sprints so far, best ${p.stats.sprintBest} right. Detailed history starts with the next sprint.` : 'No mental math chests opened yet.')));
}

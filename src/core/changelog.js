// "What's new" notes, newest first. Shown once per device after an update (src/ui/whatsnew.js).
// Keep each line short and kid-readable: new things first, then fixes and balancing.
//
// Version numbers (from v1.0, 2026-10-03): MAJOR.MINOR.
//   Major (before the point, e.g. v2.0): new features, new pets, new areas or modes.
//   Minor (after the point, e.g. v1.1): bug fixes, balancing, small tweaks.
// Builds before v1.0 were numbered v1–v61 (v61.1 was the build renamed v1.0).
export const CHANGELOG = [
  {
    v: 'v2.0', date: '2026-10-04',
    added: [
      'Rare pets each have their own signature move, and Epic pets have a once-per-battle Super Move!',
      'Every move now has its own animation: heals, shields, freezes, speed-ups and more.',
      'Answer 3 in a row and your next move hits one extra time.',
      'Sparkly pets bring an extra magic orb into every battle.',
      'The wizard learns new spells at higher levels, up to the Star Dragon.',
      'Enemies have their own magic bar: they earn orbs and spend them on special moves. When it glows ⚡, watch out!',
      'Sap now steals one of the enemy team’s magic orbs for your team.',
      'Hoot warns you when a new area’s wild pets are strong against your team, and suggests a pet that would help.',
      'When you befriend a pet, the results show how its power and health compare with your team.',
    ],
    changed: [
      'Weak moves now do something right away, and stronger moves replace older ones of the same kind.',
      'Rarer pets evolve at the same levels as common ones.',
      'The wizard levels up faster.',
      'More wild pets travel in pairs in the first two areas.',
      'Rare and Epic pets you befriend join at your team’s level.',
      'Fixed: Hex and Challenge Roar now last as long as they say.',
      'Rarer pets keep their full strength: enemies no longer get tougher because your pets are rare.',
    ],
  },
  {
    v: 'v1.3', date: '2026-10-03',
    added: [],
    changed: [
      'iPads and iPhones now use lighter graphics, so the world uses much less memory (Safari could close the page as the world appeared).',
    ],
  },
  {
    v: 'v1.2', date: '2026-10-03',
    added: [],
    changed: [
      'The world opens more gently on iPads inside the Claude app (lighter graphics, drawn in smaller batches).',
      'If the world ever fails to open, the game switches that device to lighter graphics.',
    ],
  },
  {
    v: 'v1.1', date: '2026-10-03',
    added: [],
    changed: [
      'Backups: when there’s new progress, the wizard screen offers a one-tap “Save a backup?”.',
      'On a computer, the game keeps your backup file up to date by itself after the first save.',
    ],
  },
  {
    v: 'v1.0', aka: ['v61.1'], date: '2026-10-03',
    added: [
      'Backups: grown-ups can save the family’s progress to a file, and restore it from the welcome screen.',
      'A reminder (and a glowing button) when there’s new progress to back up.',
      'These “What’s new” notes after each update.',
    ],
    changed: [],
  },
];

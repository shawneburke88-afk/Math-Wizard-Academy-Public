// "What's new" notes, newest first. Shown once per device after an update (src/ui/whatsnew.js).
// Keep each line short and kid-readable: new things first, then fixes and balancing.
//
// Version numbers (from v1.0, 2026-10-03): MAJOR.MINOR.
//   Major (before the point, e.g. v2.0): new features, new pets, new areas or modes.
//   Minor (after the point, e.g. v1.1): bug fixes, balancing, small tweaks.
// Builds before v1.0 were numbered v1–v61 (v61.1 was the build renamed v1.0).
export const CHANGELOG = [
  {
    v: 'v2.0', date: '2026-10-03',
    added: [
      'Rare pets each have their own signature move, and Epic pets have a once-per-battle Super Move!',
      'Every move now has its own animation: heals, shields, freezes, speed-ups and more.',
      'Answer 3 in a row and your next move hits one extra time.',
      'Sparkly pets bring an extra magic orb into every battle.',
      'The wizard learns new spells at higher levels, up to the Star Dragon.',
    ],
    changed: [
      'Weak moves now do something right away, and stronger moves replace older ones of the same kind.',
      'Rarer pets evolve at the same levels as common ones.',
      'The wizard levels up faster.',
      'Fixed: Hex and Challenge Roar now last as long as they say.',
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

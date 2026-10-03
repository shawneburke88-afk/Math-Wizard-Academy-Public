// Teaching Moment lessons for Grade 3 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G3 = {
  'g3-qpv-represent': {
    intro: 'Every 3-digit number is made of hundreds, tens and ones. Where a digit sits tells you what it is worth. In 346, the 3 means 3 hundreds, the 4 means 4 tens and the 6 means 6 ones. Benchmarks like 250, 500 and 750 help you tell about how big a number is.',
    introVisual: { type: 'numberline', min: 0, max: 1000, ticks: 250, labels: [0, 250, 500, 750, 1000], marks: [{ value: 470, label: '470' }] },
    strategies: [
      {
        title: 'Say what each digit is worth',
        text: 'Use a place-value chart. In 507, the 5 is worth 500, the 0 means there are no tens, and the 7 is worth 7. The 0 holds the tens place, so we write 507, not 57.',
        visual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [5, 0, 7] },
      },
      {
        title: 'Trade to rename a number',
        text: '1 hundred is the same as 10 tens, and 1 ten is the same as 10 ones. So 352 can be 3 hundreds, 4 tens and 12 ones, or 35 tens and 2 ones. It is still 352!',
        visual: { type: 'base10', hundreds: 3, tens: 4, ones: 12 },
      },
      {
        title: 'Compare from the left',
        text: 'Look at the hundreds first. If they are the same, look at the tens, then the ones. 580 > 579 because 8 tens is more than 7 tens.',
      },
      {
        title: 'Use benchmarks 250, 500, 750',
        text: 'Find the two benchmarks a number is between, then check the halfway point. 470 is between 250 and 500. Halfway is 375, and 470 is past it, so 470 is closest to 500. Look at the number line at the top.',
      },
    ],
  },

  'g3-qpv-fractions': {
    intro: 'A fraction names equal parts of a whole or of a set. The bottom number (the denominator) tells how many equal parts there are in all. The top number (the numerator) tells how many parts we are talking about. This circle shows [[f:3/4]].',
    introVisual: { type: 'fractioncircle', parts: 4, shaded: 3, color: 'blue' },
    strategies: [
      {
        title: 'Count the parts',
        text: 'Count all the equal parts: that is the bottom number. Count the shaded parts: that is the top number. 3 of 8 equal parts shaded is [[f:3/8]].',
        visual: { type: 'fractionbar', bars: [{ parts: 8, shaded: 3, color: 'green', label: '[[f:3/8]]' }] },
      },
      {
        title: 'Same bottom? Compare the tops',
        text: 'When the bottom numbers match, the parts are the same size, so more parts means more. [[f:5/8]] > [[f:3/8]] because 5 parts is more than 3 parts.',
        visual: { type: 'fractionbar', bars: [{ parts: 8, shaded: 5, color: 'orange', label: '[[f:5/8]]' }, { parts: 8, shaded: 3, color: 'orange', label: '[[f:3/8]]' }] },
      },
      {
        title: 'More parts, smaller pieces',
        text: 'For fractions with 1 on top, look at the bottom number. Cutting a whole into more parts makes each part smaller. So [[f:1/4]] < [[f:1/2]].',
        visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, color: 'purple', label: '[[f:1/2]]' }, { parts: 4, shaded: 1, color: 'purple', label: '[[f:1/4]]' }] },
      },
      {
        title: 'A whole is all the parts',
        text: 'One whole is [[f:2/2]], [[f:4/4]] or [[f:8/8]]. If [[f:3/8]] and [[f:1/8]] of a cake are eaten, that is 4 parts. 8 − 4 = 4 parts are left, so [[f:4/8]] is left.',
      },
    ],
  },

  'g3-qpv-count': {
    intro: 'Skip counting means jumping by the same amount each time, like 25, 50, 75, 100. It helps you count faster, spot patterns and get ready for multiplying.',
    introVisual: {
      type: 'numberline', min: 0, max: 100, ticks: 25, labels: 'all',
      jumps: [{ from: 0, to: 25, label: '+25' }, { from: 25, to: 50, label: '+25' }, { from: 50, to: 75, label: '+25' }, { from: 75, to: 100, label: '+25' }],
    },
    strategies: [
      {
        title: 'Find the jump',
        text: 'Look at two numbers side by side. How much did it go up or down? In 340, 344, 348, the jump is 4 each time, so the next number is 352.',
      },
      {
        title: 'Watch the tens and hundreds',
        text: 'Counting by 10s makes the tens digit go up by 1: 470, 480, 490. After 9 tens you reach the next hundred: 500, then 510. On a hundred chart, each jump of 10 goes straight down one row. Counting back by 100s: 899, 799, 699.',
        visual: { type: 'pattern', items: [470, 480, 490, 500, 510] },
      },
      {
        title: 'Count back carefully',
        text: 'To count back by 4s, take away 4 each time: 60, 56, 52, 48. Check by counting forward by 4s. You should say the same numbers.',
      },
      {
        title: 'Count by fractions',
        text: 'Counting by fourths goes [[f:1/4]], [[f:2/4]], [[f:3/4]], [[f:4/4]], [[f:5/4]]. The top number goes up by 1 each time. [[f:4/4]] is 1 whole. You can keep counting past 1: [[f:5/4]] is 1 whole and [[f:1/4]] more.',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 4, color: 'teal', label: '1' }, { parts: 4, shaded: 1, color: 'teal', label: '[[f:1/4]]' }] },
      },
    ],
  },

  'g3-ops-addsub': {
    intro: 'Adding puts amounts together. Subtracting takes away or finds the difference. Choose a strategy that makes the numbers easy, like jumps on an open number line: 318 + 50 = 368, then + 7 = 375. Estimate first by rounding: 489 + 312 is about 500 + 300 = 800, so an answer near 800 makes sense.',
    introVisual: { type: 'numberline', min: 318, max: 375, labels: [318, 368, 375], jumps: [{ from: 318, to: 368, label: '+50' }, { from: 368, to: 375, label: '+7' }] },
    strategies: [
      {
        title: 'Split by place value',
        text: 'Add the hundreds, the tens and the ones on their own. 346 + 125: 300 + 100 = 400, 40 + 20 = 60, 6 + 5 = 11. Then 400 + 60 + 11 = 471.',
      },
      {
        title: 'Jump on an open number line',
        text: 'Start at the bigger number and jump by tens, then by ones, like the number line at the top shows for 318 + 57. For 346 + 38, start at 346. Jump +30 to 376, then +8 to 384.',
      },
      {
        title: 'Use a friendly number',
        text: '598 + 245: think 600 + 245 = 845. You added 2 extra, so take 2 away: 843. For 452 − 99, take away 100 to get 352. You took 1 too many, so add 1 back: 353.',
      },
      {
        title: 'Count up to subtract',
        text: 'When the numbers are close, count up from the smaller one. 503 − 497: from 497 to 500 is 3, and from 500 to 503 is 3 more. 3 + 3 = 6, so 503 − 497 = 6.',
        visual: { type: 'numberline', min: 497, max: 503, labels: [497, 500, 503], jumps: [{ from: 497, to: 500, label: '+3' }, { from: 500, to: 503, label: '+3' }] },
      },
    ],
  },

  'g3-ops-muldiv': {
    intro: 'Multiplication means equal groups. 4 × 5 means 4 groups of 5, which makes 20. Division means sharing or making equal groups: 20 ÷ 4 means sharing 20 into 4 equal groups, so each group gets 5.',
    introVisual: { type: 'groups', groups: 4, each: 5, icon: '⭐' },
    strategies: [
      {
        title: 'Make an array',
        text: 'An array has equal rows. 3 rows of 5 is 3 × 5 = 15. Turn it on its side and you get 5 rows of 3: 5 × 3 = 15. You can multiply in any order!',
        visual: { type: 'array', rows: 3, cols: 5 },
      },
      {
        title: 'Share one at a time',
        text: 'To share 12 cookies with 4 friends, deal them out one at a time until none are left. Each friend gets 3, so 12 ÷ 4 = 3.',
        visual: { type: 'groups', groups: 4, each: 3, icon: '🍪' },
      },
      {
        title: 'Use fact families',
        text: 'Multiplying and dividing undo each other. 5 × 6 = 30 goes with 30 ÷ 5 = 6 and 30 ÷ 6 = 5. In division, order matters: 30 ÷ 5 is not the same as 5 ÷ 30. And times 1 keeps a number the same: 1 × 7 = 7.',
      },
      {
        title: 'Build from a fact you know',
        text: '2 × 3 = 6, so 4 × 3 is double: 6 + 6 = 12. In the picture, each side of the line is 2 groups of 3. And 5 × 6 = 30, so 6 × 6 is one more group of 6: 30 + 6 = 36.',
        visual: { type: 'array', rows: 3, cols: 4, split: 2 },
      },
    ],
  },

  'g3-ops-facts': {
    intro: 'Knowing your times facts by heart makes math faster. Start with ×1, ×2, ×5 and ×10. Then use those facts to work out the harder ones, like ×3, ×4, ×9, ×6, ×8 and ×7. The number line shows 6 jumps of 5: 6 × 5 = 30.',
    introVisual: {
      type: 'numberline', min: 0, max: 30, ticks: 5, labels: 'all',
      jumps: [{ from: 0, to: 5 }, { from: 5, to: 10 }, { from: 10, to: 15 }, { from: 15, to: 20 }, { from: 20, to: 25 }, { from: 25, to: 30 }],
    },
    strategies: [
      {
        title: 'Count by 10s and 5s',
        text: 'For ×10, count by 10s: 6 × 10 = 60. For ×5, count by 5s: 5, 10, 15, 20, 25, 30, so 6 × 5 = 30. Or find ×10 and take half: half of 60 is 30.',
      },
      {
        title: 'Double, then double again',
        text: '×2 is a double: 2 × 7 = 7 + 7 = 14. For ×4, double again: 4 × 7 = 14 + 14 = 28. For ×8, double once more: 8 × 7 = 28 + 28 = 56. In the picture, each half is 2 × 7.',
        visual: { type: 'array', rows: 7, cols: 4, split: 2 },
      },
      {
        title: 'Add or take away a group',
        text: '3 × 8 is 2 × 8 plus one more 8: 16 + 8 = 24. 9 × 6 is 10 × 6 take away one 6: 60 − 6 = 54. 7 × 6 is 5 × 6 plus 2 × 6: 30 + 12 = 42 (see the picture).',
        visual: { type: 'array', rows: 6, cols: 7, split: 5 },
      },
      {
        title: 'Divide by thinking multiply',
        text: 'For 54 ÷ 9, ask: 9 times what number makes 54? 9 × 6 = 54, so 54 ÷ 9 = 6. You can also skip count by 9s up to 54 and count the jumps.',
      },
    ],
  },

  'g3-pat-equations': {
    intro: 'In an equation, the = sign means both sides are worth the same, like a balanced scale. A box or a shape stands for a missing number. Find the number that makes both sides equal.',
    introVisual: { type: 'balance', left: '8 + ?', right: '15', tilt: 'level' },
    strategies: [
      {
        title: 'Part or whole?',
        text: 'Decide if the missing number is a part or the whole. In 181 + □ = 384, 384 is the whole and □ is a part. To find a part, subtract: 384 − 181 = 203.',
        visual: { type: 'barmodel', whole: 384, parts: [181, '?'] },
      },
      {
        title: 'Missing start? Work backwards',
        text: 'In □ − 45 = 30, someone took away 45 and 30 was left. Put the parts back together: 30 + 45 = 75. So □ = 75.',
        visual: { type: 'barmodel', whole: '?', parts: [45, 30] },
      },
      {
        title: 'Make both sides equal',
        text: 'For ▲ + 223 = 312 + 248, work out the side you can: 312 + 248 = 560. Now ▲ + 223 = 560, so ▲ = 560 − 223 = 337. Check: 337 + 223 = 560.',
        visual: { type: 'barmodel', whole: 560, parts: ['▲', 223] },
      },
      {
        title: 'Turn the story into an equation',
        text: 'Use □ for the number you do not know. "Mia had some shells. She found 25 more. Now she has 60." That is □ + 25 = 60. Then 60 − 25 = 35, so Mia had 35 shells.',
      },
    ],
  },

  'g3-pat-patterns': {
    intro: 'A pattern follows a rule. A repeating pattern has a core: the part that repeats over and over. A growing or shrinking number pattern adds or takes away the same amount each time.',
    introVisual: {
      type: 'pattern', highlightCore: 4,
      items: [
        { shape: 'circle', color: 'red' }, { shape: 'square', color: 'blue' }, { shape: 'square', color: 'blue' }, { shape: 'triangle', color: 'green' },
        { shape: 'circle', color: 'red' }, { shape: 'square', color: 'blue' }, { shape: 'square', color: 'blue' }, { shape: 'triangle', color: 'green' },
        '?',
      ],
    },
    strategies: [
      {
        title: 'Find the core',
        text: 'Say the pattern out loud: red circle, blue square, blue square, green triangle, then it starts again. That is the core. Check both the shape and the colour. After a green triangle comes a red circle.',
      },
      {
        title: 'Find the rule',
        text: 'Find the jump between numbers side by side. In 530, 480, 430, 380, each number is 50 less. The rule is "start at 530 and subtract 50 each time", so the next number is 330.',
        visual: { type: 'pattern', items: [530, 480, 430, 380, '?'] },
      },
      {
        title: 'Check every jump',
        text: 'To find a mistake, check each jump. In 865, 868, 871, 875, 877, the jumps are +3, +3, +4, +2. The 875 breaks the rule. It should be 874.',
      },
      {
        title: 'Count by cores for far items',
        text: 'To find the 26th item when the core has 4 items, count by 4s: 4, 8, 12, 16, 20, 24. That is 6 full cores. Items 25 and 26 are the 1st and 2nd items of the core.',
      },
    ],
  },

  'g3-meas-time': {
    intro: 'The short hand on a clock shows the hour. The long hand shows the minutes. We use a.m. for times from midnight to noon, and p.m. for times from noon to midnight.',
    introVisual: { type: 'clock', hour: 7, minute: 35, digital: 'both' },
    strategies: [
      {
        title: 'Read the short hand first',
        text: 'The short hand tells the hour it has just passed. At 7:35 it is between the 7 and the 8, so the hour is still 7.',
      },
      {
        title: 'Count by 5s, then by 1s',
        text: 'Each number on the clock means 5 more minutes. Count by 5s to the last number the long hand passed, then count on by 1s. Here: 5, 10, 15, 20, then 21, 22. The time is 9:22.',
        visual: { type: 'clock', hour: 9, minute: 22 },
      },
      {
        title: 'a.m. or p.m.?',
        text: 'Think about what is happening. Breakfast and walking to school happen in the morning, so they are a.m. Soccer after school and supper happen in the afternoon or evening, so they are p.m.',
      },
      {
        title: 'Write dates as yyyy/mm/dd',
        text: 'Write the year, then the month, then the day. Use 2 digits for the month and the day. July 4, 2026 is 2026/07/04. One week later, add 7 days: 2026/07/11.',
        visual: { type: 'calendar', month: 7, year: 2026, highlight: [4, 11] },
      },
    ],
  },

  'g3-meas-measure': {
    intro: 'We measure length in centimetres (cm), decimetres (dm) and metres (m). We measure mass in grams (g) and kilograms (kg). Choosing the right unit and knowing how units fit together help you measure and compare.',
    introVisual: { type: 'ruler', length: 12, object: 'crayon', objectLength: 7, start: 2, unit: 'cm' },
    strategies: [
      {
        title: 'Read both ends of the ruler',
        text: 'Line up one end with 0 if you can. If the object does not start at 0, subtract the start from the end. The crayon at the top goes from 2 to 9: 9 − 2 = 7, so it is 7 cm long.',
      },
      {
        title: 'Use referents',
        text: 'A centimetre is about the width of your finger. A metre is about one big step. A paper clip has a mass of about 1 g, and a big carton of milk is about 1 kg. Use these to estimate and to pick a unit.',
      },
      {
        title: 'Know how units fit together',
        text: '1 m = 10 dm = 100 cm, and 1 dm = 10 cm. So 5 m = 50 dm = 500 cm. For mass, 1 kg = 1000 g, so 600 g and 400 g together make 1 kg.',
        visual: { type: 'table', headers: ['m', 'dm', 'cm'], rows: [[1, 10, 100], [2, 20, 200], [5, 50, 500]] },
      },
      {
        title: 'Change to the same unit',
        text: 'Which is longer, 3 m 14 cm or 308 cm? Change 3 m 14 cm to centimetres: 300 + 14 = 314 cm. 314 is more than 308, so 3 m 14 cm is longer.',
      },
    ],
  },

  'g3-geo-polygons': {
    intro: 'A polygon is a closed shape with only straight sides. We name polygons by counting sides: a triangle has 3, a quadrilateral has 4, a pentagon has 5, a hexagon has 6 and an octagon has 8.',
    introVisual: {
      type: 'shapes',
      items: [
        { shape: 'triangle', color: 'red', label: '3 sides' }, { shape: 'square', color: 'blue', label: '4 sides' },
        { shape: 'pentagon', color: 'green', label: '5 sides' }, { shape: 'hexagon', color: 'orange', label: '6 sides' },
        { shape: 'octagon', color: 'purple', label: '8 sides' },
      ],
    },
    strategies: [
      {
        title: 'Count sides and vertices',
        text: 'Put your finger on one corner and go around the shape, counting each side until you are back at the start. A vertex is a corner where two sides meet. A polygon has as many vertices as sides.',
      },
      {
        title: 'Regular or irregular?',
        text: 'A regular polygon has all sides the same length and all angles the same size. If even one side or angle is different, it is irregular. Both of these shapes are hexagons.',
        visual: { type: 'shapes', items: [{ shape: 'hexagon', color: 'teal', label: 'regular' }, { shape: 'irregular_hexagon', color: 'pink', label: 'irregular' }] },
      },
      {
        title: 'Test corners with a page',
        text: 'A right angle is a square corner, like the corner of a page. Hold a page corner up to each corner of the shape. A rectangle has 4 right angles. This triangle has 1.',
        visual: { type: 'shapes', items: [{ shape: 'rectangle', color: 'yellow' }, { shape: 'right_triangle', color: 'green' }] },
      },
      {
        title: 'Prism or pyramid?',
        text: 'A prism has two matching ends joined by rectangles. A pyramid has one base, and its triangle faces meet at a point. Name them by the base: a square pyramid has 5 faces, 8 edges and 5 vertices.',
        visual: { type: 'solids', items: [{ solid: 'tri_prism', color: 'blue', label: 'prism' }, { solid: 'rect_prism', color: 'green', label: 'prism' }, { solid: 'square_pyramid', color: 'orange', label: 'pyramid' }] },
      },
    ],
  },

  'g3-data-data': {
    intro: 'A bar graph uses bars to show data. The title tells what the graph is about, the labels name the bars, and the numbers on the scale count by 1s, so each square is one vote. A longer bar means more.',
    introVisual: { type: 'bargraph', title: 'Favourite Pet', labels: ['Dog', 'Cat', 'Fish', 'Bird'], values: [8, 12, 4, 6], scale: 1, yLabel: 'Number of students' },
    strategies: [
      {
        title: 'Read the scale',
        text: 'Bars can go up or sideways. Follow the end of a bar straight across to the number on the scale. In the Favourite Pet graph, the Cat bar ends at 12, so 12 students chose cat. You can also count the squares in the bar, one for each student.',
      },
      {
        title: 'How many more? Subtract',
        text: '"How many more" means find the difference. In the Favourite Pet graph, Cat has 12 and Fish has 4. 12 − 4 = 8, so 8 more students chose cat than fish.',
        visual: { type: 'barmodel', whole: 12, parts: [4, '?'], labels: ['Fish', 'more for Cat'] },
      },
      {
        title: 'How many in all? Add',
        text: '"How many students answered the survey?" means add every bar. In the Favourite Pet graph: 8 + 12 + 4 + 6 = 30 students.',
      },
      {
        title: 'First-hand or second-hand?',
        text: 'First-hand data is data you collect yourself, by asking, counting or measuring. Second-hand data was collected by someone else, like data from a book, a website or a newspaper.',
      },
    ],
  },

  'g3-data-chance': {
    intro: 'Chance tells how likely something is to happen. It can be impossible (it can never happen), unlikely, likely, or certain (it will always happen).',
    introVisual: { type: 'marbles', items: [{ color: 'red', count: 7 }, { color: 'blue', count: 2 }] },
    strategies: [
      {
        title: 'Count each colour',
        text: 'This jar has 7 red marbles and 2 blue marbles. Picking red is likely, because most marbles are red. Picking blue is unlikely. Picking green is impossible, because there are no green marbles.',
      },
      {
        title: 'Look at the spinner sizes',
        text: 'The bigger a colour\'s part of the spinner, the more likely it is to land there. On this spinner, blue is most likely and yellow, the smallest part, is least likely.',
        visual: { type: 'spinner', sections: [{ color: 'blue', label: 'Blue', size: 3 }, { color: 'yellow', label: 'Yellow', size: 1 }, { color: 'green', label: 'Green', size: 2 }] },
      },
      {
        title: 'Certain or impossible?',
        text: 'Certain means it happens every time, like picking red from a jar of only red marbles. Impossible means it can never happen, like rolling a 7 on a regular die with the numbers 1 to 6.',
      },
      {
        title: 'Make it more likely',
        text: 'A colour is more likely when it has more marbles than the other colour. With 2 blue and 3 red, adding 1 blue makes 3 and 3, which is equally likely. Adding 2 blue makes 4 blue, which is more than 3 red.',
        visual: { type: 'marbles', items: [{ color: 'blue', count: 4 }, { color: 'red', count: 3 }] },
      },
    ],
  },

  'g3-data-money': {
    intro: 'Canadian money uses nickels (5¢), dimes (10¢), quarters (25¢), loonies ($1), toonies ($2) and bills like $5, $10 and $20. There are 100 cents in 1 dollar. Other countries use different money, like the rupee in India.',
    introVisual: { type: 'coins', items: ['bill5', 'toonie', 'loonie', 'quarter', 'quarter', 'dime', 'nickel'] },
    strategies: [
      {
        title: 'Biggest first, then count on',
        text: 'Start with the money worth the most. For the money at the top: $5, then a toonie makes $7, a loonie makes $8, two quarters make $8.25, $8.50, a dime makes $8.60 and a nickel makes $8.65.',
      },
      {
        title: 'Count bills, then big coins',
        text: 'Bills and big coins count in whole dollars. For two $20 bills, a $5 bill and a toonie, count 20, 40, 45, then 47. That is $47. When there are cents too, $8.65 means 8 dollars and 65 cents.',
        visual: { type: 'coins', items: ['bill20', 'bill20', 'bill5', 'toonie'] },
      },
      {
        title: 'Fewest coins and bills',
        text: 'Use the biggest piece that fits, as many times as you can, then the next biggest. For $3.75: a toonie ($2), a loonie ($3), then 3 quarters ($3.75). That is 5 pieces.',
        visual: { type: 'coins', items: ['toonie', 'loonie', 'quarter', 'quarter', 'quarter'] },
      },
      {
        title: 'Enough money? Count up',
        text: 'Count your money, then compare it with the price. If you have $6 and a book costs $7.25, count up: $6 to $7 is $1, then 25¢ more. You need $1.25 more.',
      },
    ],
  },

  'g3-classic-perimeter': {
    intro: 'Perimeter is the distance all the way around the outside of a shape. Think of an ant walking along the edge until it gets back to the start. To find it, add up the lengths of all the sides.',
    strategies: [
      {
        title: 'Count the unit edges',
        text: 'On a grid, count the edges around the outside, not the squares inside. This rectangle is 5 units along the top and 3 units down the side: 5 + 3 + 5 + 3 = 16 units.',
        visual: { type: 'grid', cols: 7, rows: 5, rect: { x: 1, y: 1, w: 5, h: 3 }, showUnits: true },
      },
      {
        title: 'Add all the sides',
        text: 'When you know the side lengths, add every side. A triangle with sides 9 cm, 3 cm and 5 cm has a perimeter of 9 + 3 + 5 = 17 cm. Look for pairs that make friendly numbers.',
      },
      {
        title: 'Rectangles and squares',
        text: 'A rectangle has 2 equal lengths and 2 equal widths. For 6 cm by 3 cm: 6 + 3 + 6 + 3 = 18 cm. A square has 4 equal sides, so 5 cm sides make 5 + 5 + 5 + 5 = 20 cm.',
        visual: { type: 'barmodel', whole: 18, parts: [6, 3, 6, 3] },
      },
      {
        title: 'Work backwards',
        text: 'If you know the perimeter, take away the sides you know. A triangle has a perimeter of 29 cm and two sides of 6 cm and 9 cm: 29 − 15 = 14 cm. A square with a perimeter of 40 cm has 4 sides of 10 cm.',
      },
    ],
  },

  'g3-classic-timeunits': {
    intro: 'We measure time in seconds, minutes, hours, days and months. Small units fit inside bigger ones: 60 seconds make 1 minute, 60 minutes make 1 hour, and 24 hours make 1 day.',
    strategies: [
      {
        title: 'Count by 5s around the clock',
        text: 'The numbers on a clock are 5 minutes apart. When the long hand goes all the way around once, count by 5s at each number: 5, 10, 15, … 60. That is 60 minutes, or 1 hour.',
        visual: { type: 'clock', hour: 12, minute: 0, noHands: true },
      },
      {
        title: 'Add one group for each unit',
        text: 'Each hour is 60 minutes, so 2 hours = 60 + 60 = 120 minutes. Each day is 24 hours, so 3 days = 24 + 24 + 24 = 72 hours. 8 minutes is 8 groups of 60 seconds = 480 seconds.',
        visual: { type: 'table', headers: ['Hours', 'Minutes'], rows: [[1, 60], [2, 120], [3, 180]] },
      },
      {
        title: 'Change to the same unit',
        text: 'To compare 3 hours and 190 minutes, change the hours to minutes: 60 + 60 + 60 = 180 minutes. 180 is less than 190, so 3 hours is shorter. 1 hour 30 minutes is 60 + 30 = 90 minutes.',
      },
      {
        title: 'Days in a month: knuckles',
        text: 'Make two fists. Count the months across your knuckles and the dips between them, starting with January on a knuckle. Knuckle months have 31 days and dip months have 30. February has 28, or 29 in a leap year.',
      },
    ],
  },
};

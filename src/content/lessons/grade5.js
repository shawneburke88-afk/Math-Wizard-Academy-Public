// Teaching Moment lessons for Grade 5 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G5 = {
  // ---------------------------------------------------------------- Number sense
  'g5-qpv-represent': {
    intro: 'Big numbers are built from place values. In 352 406, the place of each digit tells what it is worth: the 3 is worth 300 000 and the 5 is worth 50 000. Place value helps you read, write, compare and estimate numbers up to 1 000 000.',
    introVisual: { type: 'placevalue', columns: ['Hundred Thousands', 'Ten Thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'], digits: [3, 5, 2, 4, 0, 6] },
    strategies: [
      {
        title: 'Read and write in groups of three',
        text: 'Read the digits before the space, say "thousand", then read the last three digits. 405 218 is "four hundred five thousand two hundred eighteen". When you write a number, put a 0 in any place that has nothing.',
      },
      {
        title: 'Expanded form and renaming',
        text: 'Split a number into the value of each digit: 72 040 = 70 000 + 2000 + 40. Each place is worth 10 times the place to its right, so you can rename: 900 000 is 90 ten thousands, and 453 000 is 453 thousands.',
      },
      {
        title: 'Compare digits from the left',
        text: 'Line up the places. Compare the digits from the left until two are different. In 47 430 and 47 340, the ten thousands and thousands match, but 4 hundreds is more than 3 hundreds, so 47 430 > 47 340.',
        visual: { type: 'table', headers: ['Place', '47 430', '47 340'], rows: [['Ten thousands', 4, 4], ['Thousands', 7, 7], ['Hundreds', 4, 3]] },
      },
      {
        title: 'Find the closest benchmark',
        text: 'Benchmarks like 250 000, 500 000 and 750 000 help you place big numbers on a number line. 612 400 is between 500 000 and 750 000. The halfway point is 625 000, and 612 400 is less than that, so it is closer to 500 000.',
        visual: { type: 'numberline', min: 0, max: 1000000, ticks: 250000, labels: 'all', marks: [{ value: 612400, label: '612 400' }] },
      },
    ],
  },

  'g5-qpv-fracdec': {
    intro: 'Fractions and decimals are two ways to name parts of a whole. [[f:3/4]], [[f:75/100]] and 0.75 all name the same amount. You will rename fractions, find equal fractions, and compare fractions with decimals.',
    strategies: [
      {
        title: 'Tenths and hundredths on a grid',
        text: 'The whole grid is 1. Each column is one tenth (0.1) and each small square is one hundredth (0.01). 7 full columns and 2 more squares is 0.72, which is [[f:72/100]].',
        visual: { type: 'hundredgrid', shaded: 72 },
      },
      {
        title: 'Make equivalent fractions',
        text: 'Multiply or divide the top and bottom by the same number. [[f:2/4]] = [[f:6/12]] (both × 3), and [[f:2/10]] = [[f:1/5]] (both ÷ 2). Adding the same number to the top and bottom does NOT make an equal fraction.',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 2, label: '[[f:2/4]]' }, { parts: 12, shaded: 6, label: '[[f:6/12]]' }] },
      },
      {
        title: 'Mixed numbers and improper fractions',
        text: 'One whole is [[f:5/5]]. So [[f:8/5]] is 5 fifths and 3 more fifths: [[f:1 3/5]]. To go back, [[f:2 1/2]] is 2 wholes of 2 halves each, plus 1 half: 2 × 2 + 1 = 5 halves, or [[f:5/2]].',
        visual: { type: 'fractionbar', bars: [{ parts: 5, shaded: 5, label: '1' }, { parts: 5, shaded: 3, label: '[[f:3/5]]' }] },
      },
      {
        title: 'Change to decimals, then compare',
        text: 'Make the bottom number 10 or 100: [[f:2/5]] = [[f:4/10]] = 0.4. Then compare place by place. 0.4 = 0.40, and 4 tenths is more than 2 tenths, so 0.4 > 0.25. More digits does not mean bigger.',
      },
    ],
  },

  'g5-qpv-count': {
    intro: 'Counting patterns work for numbers of every size. You can skip count by thousands, and you can count by fractions like [[f:1/4]] or decimals like 0.1 and 0.01. First find the jump, then keep making the same jump.',
    introVisual: { type: 'numberline', min: 0, max: 2, ticks: 0.25, labels: 'all', labelFormat: 'fraction', denominator: 4, jumps: [{ from: 0.75, to: 1, label: '+[[f:1/4]]' }, { from: 1, to: 1.25, label: '+[[f:1/4]]' }, { from: 1.25, to: 1.5, label: '+[[f:1/4]]' }] },
    strategies: [
      {
        title: 'Find the jump',
        text: 'Subtract two numbers that sit side by side. In 29 000, 34 000, 39 000, the jump is 5000, so the next number is 44 000. If the numbers get smaller, subtract the jump instead.',
      },
      {
        title: 'Count by fractions',
        text: 'Count by fourths, like the number line above: [[f:3/4]], [[f:4/4]], [[f:5/4]], [[f:6/4]]. When the top number reaches 4, you have 1 whole. So [[f:4/4]] = 1, [[f:5/4]] = [[f:1 1/4]] and [[f:6/4]] = [[f:1 2/4]].',
      },
      {
        title: 'Count by tenths and hundredths',
        text: 'Ten tenths make one whole: 4.8, 4.9, 5, 5.1. Ten hundredths make one tenth: 2.29, 2.30, 2.31. Watch the next place to the left change when you count past 9.',
      },
      {
        title: 'Add all the jumps at once',
        text: 'To count on by [[f:1/3]] six times from 1, add the jumps first: 6 thirds is [[f:6/3]] = 2, and 1 + 2 = 3. For "eight tenths more than 8.7", add 0.8: 8.7 + 0.8 = 9.5.',
      },
    ],
  },

  // ---------------------------------------------------------------- Operations
  'g5-ops-addsub': {
    intro: 'You will add and subtract big whole numbers and decimals to hundredths. A bar model shows how the parts and the whole fit together. An estimate gives you a target, so you can tell if your exact answer makes sense.',
    introVisual: { type: 'barmodel', whole: '?', parts: [544517, 215483] },
    strategies: [
      {
        title: 'Estimate by rounding',
        text: 'Round each number to a friendly place, then add or subtract. 12 673 + 8540 is about 13 000 + 9000 = 22 000. For decimals, round to whole numbers: 5.91 + 6.05 is about 6 + 6 = 12.',
      },
      {
        title: 'Line up the decimal points',
        text: 'Line up the decimal points, not the last digits. For 4.6 + 0.75, write 4.6 as 4.60 so both numbers have 2 decimal places. Add each column from the right, as with whole numbers, and bring the point straight down: 5.35.',
        visual: { type: 'table', headers: ['', 'Ones', '.', 'Tenths', 'Hundredths'], rows: [['', 4, '.', 6, 0], ['+', 0, '.', 7, 5], ['=', 5, '.', 3, 5]] },
      },
      {
        title: 'Use a friendly number (compensation)',
        text: 'To find 70 000 − 998, take away 1000 instead: 70 000 − 1000 = 69 000. You took away 2 too many, so add 2 back: 69 002.',
      },
      {
        title: 'Part, part, whole',
        text: 'In □ − 544 517 = 215 483, the box is the whole (like the bar model above), so add the parts: 544 517 + 215 483 = 760 000. If the box is a part, subtract the part you know from the whole.',
      },
    ],
  },

  'g5-ops-properties': {
    intro: 'Zero and one follow special rules when you multiply and divide. Every division fact has a matching multiplication fact, and that link explains why the rules work.',
    strategies: [
      {
        title: 'Zero shared is zero',
        text: '0 ÷ 6 means sharing nothing among 6 groups, so each group gets 0. Check with multiplication: 6 × 0 = 0. Any number times 0 is 0, too: 0 × 869 = 0.',
        visual: { type: 'groups', groups: 6, each: 0 },
      },
      {
        title: 'You cannot divide by zero',
        text: '5 ÷ 0 would need a number that makes 5 when you multiply it by 0. But every number times 0 is 0, so no number works. 5 ÷ 0 has no answer. We say it is not defined.',
      },
      {
        title: 'Rules for 1, and any order',
        text: 'A number times 1 or divided by 1 stays the same: 118 × 1 = 118. A number divided by itself is 1: 4 ÷ 4 = 1. You can multiply in any order, so look for friendly pairs: 25 × 4 × 3 = 100 × 3 = 300.',
      },
      {
        title: 'Fact families and splitting',
        text: '8 × 9 = 72 goes with 9 × 8 = 72, 72 ÷ 9 = 8 and 72 ÷ 8 = 9. You can also split a factor into easy parts: 4 × 12 = 4 × 10 + 4 × 2 = 40 + 8 = 48.',
        visual: { type: 'array', rows: 4, cols: 12, split: 10 },
      },
    ],
  },

  'g5-ops-facts': {
    intro: 'Knowing your times facts makes bigger multiplying and dividing much faster. You can build a hard fact from easy facts you already know, like × 2, × 5 and × 10.',
    strategies: [
      {
        title: 'Start from a fact you know',
        text: '9 × 7 is 10 × 7 take away one group of 7: 70 − 7 = 63. For × 6, find × 5 and add one more group: 6 × 8 = 40 + 8 = 48.',
      },
      {
        title: 'Break apart × 11 and × 12',
        text: '× 11 is × 10 plus one more group: 11 × 6 = 60 + 6 = 66. × 12 is × 10 plus × 2: 12 × 3 = 30 + 6 = 36. The dashed line splits 12 columns into 10 and 2.',
        visual: { type: 'array', rows: 3, cols: 12, split: 10 },
      },
      {
        title: 'Use doubles',
        text: '× 4 is double, then double again: 4 × 7 → 14 → 28. × 8 is double three times: 8 × 6 → 12 → 24 → 48. 12 is double 6, so 12 × 7 is double 6 × 7: double 42 is 84.',
      },
      {
        title: 'Divide by thinking multiply',
        text: '35 ÷ 5 asks: 5 times what makes 35? Split 35 into 5 equal rows: each row has 7, because 5 × 7 = 35. It works for big facts too: 12 × 7 = 84, so 84 ÷ 12 = 7.',
        visual: { type: 'array', rows: 5, cols: 7 },
      },
    ],
  },

  'g5-ops-multidigit': {
    intro: 'When numbers get bigger, you can still multiply and divide them by breaking them into place-value parts. Estimate first so you know about how big the answer should be.',
    strategies: [
      {
        title: 'Estimate with friendly numbers',
        text: 'Round to numbers that are easy to use. 89 × 49 is about 90 × 50 = 4500. For 482 ÷ 8, use 480 ÷ 8 = 60. Times 10 moves each digit one place left (61 × 10 = 610), and ÷ 1000 moves each digit three places right (318 000 ÷ 1000 = 318).',
      },
      {
        title: 'Use an area model',
        text: 'Split both numbers into tens and ones. For 47 × 23: 40 × 20 = 800, 7 × 20 = 140, 40 × 3 = 120 and 7 × 3 = 21. Add all the parts: 800 + 140 + 120 + 21 = 1081.',
        visual: { type: 'table', title: 'Area model', headers: ['×', '40', '7'], rows: [['20', '800', '140'], ['3', '120', '21']] },
      },
      {
        title: 'Divide with partial quotients',
        text: 'Take away easy chunks of the divisor. For 847 ÷ 7: 7 × 100 = 700, which leaves 147. 7 × 20 = 140, which leaves 7. 7 × 1 = 7, which leaves 0. Add the chunks: 100 + 20 + 1 = 121.',
        visual: { type: 'table', title: '847 ÷ 7', headers: ['Take away', 'Left over'], rows: [['7 × 100 = 700', 147], ['7 × 20 = 140', 7], ['7 × 1 = 7', 0]] },
      },
      {
        title: 'Decide what the remainder means',
        text: '429 ÷ 9 = 47 R6. If 429 people sit 9 at a table, the 6 left over still need seats, so round up to 48 tables. Ignore a remainder that cannot make one more group. Share it as a fraction when it can be cut up.',
      },
    ],
  },

  // ---------------------------------------------------------------- Patterns
  'g5-pat-equations': {
    intro: 'An equation is like a balanced scale: both sides are worth the same. A letter, like n, stands for an unknown number. Solving the equation means finding the number that keeps the scale balanced.',
    introVisual: { type: 'balance', left: 'n + 6', right: '8', tilt: 'level' },
    strategies: [
      {
        title: 'Undo the operation',
        text: 'Do the opposite to get the letter alone. n + 6 = 8: subtract, 8 − 6 = 2. t − 7 = 2: add, 2 + 7 = 9. m ÷ 6 = 7: multiply, 7 × 6 = 42.',
      },
      {
        title: 'A number next to a letter means ×',
        text: '4y means 4 × y. So 4y = 16 asks: 4 times what number makes 16? Undo the multiplying by dividing: 16 ÷ 4 = 4, so y = 4.',
        visual: { type: 'balance', left: '4y', right: '16', tilt: 'level' },
      },
      {
        title: 'Check by putting it back',
        text: 'Put your answer in place of the letter. If n = 2, then n + 6 is 2 + 6 = 8. Both sides match, so n = 2 is right. You can test which equation is true for a value the same way.',
      },
      {
        title: 'Write an equation from a story',
        text: 'Let a letter stand for the unknown starting amount, then follow the story. Gave away 7 and has 6 left: c − 7 = 6. Shared equally among 5 friends, 9 each: g ÷ 5 = 9. Getting more is +, and equal groups is ×.',
      },
    ],
  },

  'g5-pat-tables': {
    intro: 'A table of values shows how two things change together, like tables and the chairs around them. When you find the pattern rule, you can predict any row without counting on one row at a time.',
    introVisual: { type: 'table', headers: ['Tables', 'Chairs'], rows: [[1, 6], [2, 8], [3, 10], [4, 12]] },
    strategies: [
      {
        title: 'Find the start and the jump',
        text: 'A pattern rule tells where the pattern starts and what happens each time. The chairs go 6, 8, 10, 12, so the rule is "start at 6 and add 2 each time". These figures start at 2 and add 3, so Step 5 has 8 + 3 + 3 = 14.',
        visual: { type: 'growing', steps: [2, 5, 8], shape: 'square' },
      },
      {
        title: 'Write an expression',
        text: 'Let n be the number of tables. The chairs go up by 2 each row, so start with 2n. When n = 1, 2 × 1 = 2, but the table says 6, so add 4. The rule is 2n + 4. Check row 3: 2 × 3 + 4 = 10. It works!',
      },
      {
        title: 'Use the rule to predict',
        text: 'To find the chairs for 12 tables, do not count on 12 rows. Use the rule 2n + 4: 2 × 12 + 4 = 28 chairs.',
      },
      {
        title: 'Work backward',
        text: 'Which row has 40 chairs? Undo the rule in reverse order: 40 − 4 = 36, then 36 ÷ 2 = 18 tables. Is 79 in the pattern 2, 9, 16, 23, …? Take away the start: 79 − 2 = 77. 77 ÷ 7 = 11 with no remainder, so yes!',
      },
    ],
  },

  // ---------------------------------------------------------------- Measurement
  'g5-meas-elapsed': {
    intro: 'Elapsed time is how much time passes from a start time to an end time. You can find it, or use it to find when something starts or ends, with 12-hour times (a.m. and p.m.) or 24-hour times.',
    strategies: [
      {
        title: 'Count on in chunks',
        text: 'From 5:35 p.m. to 7:20 p.m.: count 25 min up to 6:00, then 1 h up to 7:00, then 20 min more. Add the chunks: 25 min + 1 h + 20 min = 1 h 45 min.',
        visual: { type: 'table', headers: ['From', 'To', 'Time'], rows: [['5:35 p.m.', '6:00 p.m.', '25 min'], ['6:00 p.m.', '7:00 p.m.', '1 h'], ['7:00 p.m.', '7:20 p.m.', '20 min'], ['', 'Total', '1 h 45 min']] },
      },
      {
        title: 'Add to find the end time',
        text: 'Potion class starts at 2:40 p.m. and lasts 35 min. 20 min takes you to 3:00, and 15 more minutes makes 3:15 p.m. If the minutes reach 60 or more, trade 60 minutes for 1 hour.',
        visual: { type: 'clock', hour: 14, minute: 40 },
      },
      {
        title: 'Count back to find the start',
        text: 'A nap ended at 4:50 p.m. and lasted 3 h 55 min. Count back the hours first: 3 h before 4:50 p.m. is 1:50 p.m. Then count back 55 min: 12:55 p.m.',
      },
      {
        title: 'Switch to 24-hour time',
        text: 'For p.m. times after noon, add 12 to the hour: 7:45 p.m. is 19:45. To go back, take 12 away: 15:30 is 3:30 p.m. Morning times keep their hour, written with 2 digits: 4:55 a.m. is 04:55.',
        visual: { type: 'clock', hour: 19, minute: 45, digital: 'both', h24: true },
      },
    ],
  },

  'g5-meas-measure': {
    intro: 'Measurement tells how long, how big or how much. Perimeter is the distance around a shape, area is the flat space inside it, and volume is the space a 3-D object takes up.',
    strategies: [
      {
        title: 'Area and perimeter of rectangles',
        text: 'Area = length × width, so this 6 by 4 rectangle covers 24 square units. Perimeter adds all four sides: 6 + 4 + 6 + 4 = 20 units. A 5 by 5 square uses the same 20 units of fence but covers 25 square units: the more square a shape is, the more area it holds.',
        visual: { type: 'grid', cols: 8, rows: 6, rect: { x: 1, y: 1, w: 6, h: 4 }, showUnits: true },
      },
      {
        title: 'Find volume in layers',
        text: 'Count the cubes in the bottom layer, then multiply by the number of layers. This prism has 4 × 3 = 12 cubes in a layer and 2 layers, so its volume is 24 cm³. That is length × width × height.',
        visual: { type: 'prism', l: 4, w: 3, h: 2, showCubes: true },
      },
      {
        title: 'Convert metric units',
        text: 'Changing to a smaller unit gives you more of them, so multiply. Changing to a bigger unit gives fewer, so divide. 270 cm = 270 ÷ 100 = 2.7 m, and 1250 mL = 1250 ÷ 1000 = 1.25 L.',
        visual: { type: 'table', title: 'Metric units', headers: ['Unit', 'Equals'], rows: [['1 km', '1000 m'], ['1 m', '100 cm'], ['1 cm', '10 mm'], ['1 L', '1000 mL']] },
      },
      {
        title: 'Choose a sensible unit',
        text: 'Think about size: mm for tiny things like a coin\'s thickness, cm for a pencil, m for a door, and km for long trips. Capacity (how much a container holds) uses mL or L. Volume uses cubic units like cm³ or m³.',
      },
    ],
  },

  // ---------------------------------------------------------------- Geometry
  'g5-geo-triangles': {
    intro: 'You can sort triangles by comparing the lengths of their sides. Count how many sides are the same length, and that tells you the triangle\'s name.',
    introVisual: { type: 'shapes', items: [{ shape: 'equilateral_triangle', color: 'blue', label: 'Equilateral' }, { shape: 'isosceles_triangle', color: 'green', label: 'Isosceles' }, { shape: 'scalene_triangle', color: 'orange', label: 'Scalene' }] },
    strategies: [
      {
        title: 'Count the equal sides',
        text: 'All 3 sides equal: equilateral (4 cm, 4 cm, 4 cm). Exactly 2 sides equal: isosceles (10 mm, 10 mm, 14 mm). No sides equal: scalene (5 mm, 3 mm, 6 mm).',
      },
      {
        title: 'Find a missing side',
        text: 'The perimeter is all three sides added. A triangle has sides of 7 m and 11 m and a perimeter of 26 m. The third side is 26 − 7 − 11 = 8 m. All three sides are different, so it is scalene.',
      },
      {
        title: 'Share the perimeter',
        text: 'An equilateral triangle has 3 equal sides, so a perimeter of 39 m means 39 ÷ 3 = 13 m per side. An isosceles triangle with a 5 cm base and a 53 cm perimeter: 53 − 5 = 48, and 48 ÷ 2 = 24 cm for each equal side.',
        visual: { type: 'barmodel', whole: 39, parts: [13, 13, 13], labels: ['side', 'side', 'side'] },
      },
    ],
  },

  'g5-geo-transform': {
    intro: 'A transformation moves a shape without changing its size or shape. A translation slides it, a reflection flips it over a mirror line, and a rotation turns it around a point.',
    strategies: [
      {
        title: 'Translation (slide)',
        text: 'Every corner moves the same way, and the shape still faces the same way. Pick one corner and count squares: left or right first, then up or down. This shape moved 5 right and 2 up.',
        visual: { type: 'transform', grid: 10, original: [[1, 1], [4, 1], [4, 2], [2, 2], [2, 3], [1, 3]], image: [[6, 3], [9, 3], [9, 4], [7, 4], [7, 5], [6, 5]] },
      },
      {
        title: 'Reflection (flip)',
        text: 'The image is a mirror image, so it faces the opposite way. Each corner and its matching corner are the same distance from the mirror line. Here the mirror line is the vertical line through 5.',
        visual: { type: 'transform', grid: 10, original: [[1, 1], [4, 1], [4, 2], [2, 2], [2, 3], [1, 3]], image: [[9, 1], [6, 1], [6, 2], [8, 2], [8, 3], [9, 3]], mirror: { axis: 'x', at: 5 } },
      },
      {
        title: 'Rotation (turn)',
        text: 'The shape turns around a point. A ¼ turn clockwise goes the way clock hands move. Follow a side that touches the turn point P: here the long side pointed right, and after a ¼ turn clockwise it points down.',
        visual: { type: 'coordplane', max: 10, polygon: [[4, 5], [7, 5], [7, 6], [5, 6], [5, 7], [4, 7]], polygon2: [[4, 5], [4, 2], [5, 2], [5, 4], [6, 4], [6, 5]], points: [{ x: 4, y: 5, label: 'P' }] },
      },
      {
        title: 'Which move was it?',
        text: 'Compare the before and after shapes. Same way, just in a new place: a translation. Facing the opposite way, like a mirror image: a reflection. Tilted a quarter or half turn: a rotation, like this ¼ turn around one corner. The size and shape never change.',
        visual: { type: 'transform', grid: 10, original: [[1, 5], [4, 5], [4, 6], [2, 6], [2, 7], [1, 7]], image: [[4, 8], [4, 5], [5, 5], [5, 7], [6, 7], [6, 8]] },
      },
    ],
  },

  // ---------------------------------------------------------------- Data and probability
  'g5-data-data': {
    intro: 'Data is information you collect to answer a question. A double bar graph puts two groups side by side for each category, so you can compare them at a glance.',
    introVisual: { type: 'bargraph', title: 'Favourite season', labels: ['Spring', 'Summer', 'Fall'], values: [7, 12, 5], series1Name: 'Week 1', series2: { name: 'Week 2', values: [9, 10, 6] }, scale: 2, yLabel: 'Number of votes' },
    strategies: [
      {
        title: 'First-hand or second-hand?',
        text: 'First-hand data is data you collect yourself, by counting, measuring, timing or asking. Second-hand data was collected by someone else, and you read it in a book, on a website or in a chart.',
      },
      {
        title: 'Choose a way to collect',
        text: 'Survey people to find what they like. Watch and keep a tally to count things as they happen, like birds at a feeder. Do an experiment to test something. Look it up when experts have already recorded the facts.',
        visual: { type: 'tally', title: 'Birds at the feeder', rows: [{ label: 'Robins', count: 7 }, { label: 'Blue jays', count: 4 }] },
      },
      {
        title: 'Read the key and the scale',
        text: 'The key tells you which bar is which group. Check what each grid line is worth, then follow the top of a bar across to the scale. In the graph at the top, Week 1 had 12 votes for Summer.',
      },
      {
        title: 'Compare and combine bars',
        text: 'To compare the two groups, subtract the shorter bar from the taller one: for Spring, Week 2 had 9 − 7 = 2 more votes. To find a total, add both bars: Summer got 12 + 10 = 22 votes in all.',
      },
    ],
  },

  'g5-data-chance': {
    intro: 'Probability is about how likely something is to happen. An event can be impossible, possible or certain. One outcome can be more likely, less likely or equally likely compared with another.',
    strategies: [
      {
        title: 'Impossible, possible or certain',
        text: 'Impossible means it can never happen, and certain means it happens every time. In this bag, picking yellow is impossible, picking blue is possible, and picking blue or red is certain.',
        visual: { type: 'marbles', items: [{ color: 'blue', count: 5 }, { color: 'red', count: 3 }] },
      },
      {
        title: 'Compare the amounts',
        text: 'More marbles of a colour, or a bigger part of a spinner, means more likely. The same amount means equally likely. On this spinner, green takes up half, so green is the most likely. Red and blue are equally likely.',
        visual: { type: 'spinner', sections: [{ color: 'green', label: 'green', size: 2 }, { color: 'red', label: 'red', size: 1 }, { color: 'blue', label: 'blue', size: 1 }] },
      },
      {
        title: 'Make it equal or certain',
        text: 'This bag has 7 red and 2 blue marbles. Add 5 blue marbles and both colours are equally likely (7 and 7). To make red certain, take out every marble that is not red.',
        visual: { type: 'marbles', items: [{ color: 'red', count: 7 }, { color: 'blue', count: 2 }] },
      },
    ],
  },

  'g5-data-money': {
    intro: 'Money math helps you count money, make change and plan ahead. Money uses decimals: $4.55 is 4 dollars and 55 cents. Smart planning means paying for needs, like food and a warm coat, before wants.',
    strategies: [
      {
        title: 'Count from the biggest',
        text: 'Start with the bill or coin worth the most and keep a running total: $10, $12, $12.25, $12.35. Remember: a toonie is $2, a quarter is 25¢ and a dime is 10¢.',
        visual: { type: 'coins', items: ['bill10', 'toonie', 'quarter', 'dime'] },
      },
      {
        title: 'Count up to make change',
        text: 'You buy a water bottle for $10.85 and pay with $20. Count up from the price: 15¢ makes $11, then $9 more makes $20. Your change is $9 + 15¢ = $9.15.',
      },
      {
        title: 'Ways to pay and balances',
        text: 'You can pay with cash, a debit card (money leaves your bank account right away), a credit card (you pay the bank back later), a cheque or a gift card. A $50 gift card used for a $15.99 kite and a $19.35 book has $50.00 − $35.34 = $14.66 left.',
      },
      {
        title: 'Budget and save',
        text: 'In a budget, spending + sharing + saving = the money earned. To buy a $65 game by saving $10 a week, 6 weeks is only $60, so it takes 7 weeks.',
        visual: { type: 'table', title: 'Weekly budget', headers: ['Part', 'Amount'], rows: [['Money earned', '$20'], ['Spending', '$8'], ['Sharing', '$2'], ['Saving', '$10']] },
      },
    ],
  },

  // ---------------------------------------------------------------- Classic (older curriculum)
  'g5-classic-thousandths': {
    intro: 'Thousandths are tiny parts: one whole cut into 1000 equal pieces. The third place after the decimal point is the thousandths place, so 0.846 means 8 tenths, 4 hundredths and 6 thousandths.',
    introVisual: { type: 'placevalue', columns: ['Ones', 'Tenths', 'Hundredths', 'Thousandths'], digits: [0, 8, 4, 6] },
    strategies: [
      {
        title: 'Zeros at the end keep the value',
        text: 'Zeros added at the end do not change a decimal: 0.7 = 0.70 = 0.700. Writing every number with 3 decimal places makes it easier to compare, add and subtract. Zeros right after the point DO change it: 0.07 is not 0.7.',
      },
      {
        title: 'Compare place by place',
        text: 'Which is greater, 0.699 or 0.7? Write 0.7 as 0.700. Compare the tenths first: 7 tenths is more than 6 tenths, so 0.7 is greater. More digits does not mean bigger!',
        visual: { type: 'table', headers: ['Place', '0.699', '0.700'], rows: [['Tenths', 6, 7], ['Hundredths', 9, 0], ['Thousandths', 9, 0]] },
      },
      {
        title: 'Line up the decimal points',
        text: 'For 5.9 − 2.437, write 5.900 − 2.437 so the decimal points and places line up. Subtract from the right, regrouping when you need to. The answer is 3.463.',
      },
      {
        title: 'Fractions out of 1000',
        text: 'Three digits after the point count thousandths: 0.907 = [[f:907/1000]] and 0.008 = [[f:8/1000]]. When you read, "and" is the decimal point: "nine and seven hundred forty-five thousandths" is 9.745.',
      },
    ],
  },

  'g5-classic-quads': {
    intro: 'Quadrilaterals are shapes with 4 sides. You can sort them by their sides and corners: Which sides are parallel? Which sides are equal? Are the corners right angles?',
    introVisual: { type: 'venn', leftLabel: '4 right angles', rightLabel: '4 equal sides', left: ['Rectangle'], both: ['Square'], right: ['Rhombus'] },
    strategies: [
      {
        title: 'Parallel and perpendicular',
        text: 'Parallel sides go the same way and never meet, like train tracks. Perpendicular sides meet at a square corner. In this trapezoid, AB is parallel to CD, and side DA is vertical and perpendicular to AB.',
        visual: { type: 'coordplane', max: 8, polygon: [[1, 1], [7, 1], [5, 5], [1, 5]], points: [{ x: 1, y: 1, label: 'A' }, { x: 7, y: 1, label: 'B' }, { x: 5, y: 5, label: 'C' }, { x: 1, y: 5, label: 'D' }] },
      },
      {
        title: 'Count the parallel pairs',
        text: '2 pairs of parallel sides: a parallelogram (rectangles, rhombuses and squares are parallelograms too). Exactly 1 pair: a trapezoid. No parallel sides, with 2 pairs of equal sides that touch: a kite.',
        visual: { type: 'shapes', items: [{ shape: 'parallelogram', color: 'purple', label: '2 pairs' }, { shape: 'trapezoid', color: 'red', label: '1 pair' }, { shape: 'kite', color: 'teal', label: 'no pairs' }] },
      },
      {
        title: 'Check the sides and corners',
        text: '4 right angles: a rectangle. 4 equal sides: a rhombus. Both: a square, which sits in the middle of the diagram above. So a square is also a rectangle and a rhombus. Always choose the most exact name.',
      },
      {
        title: 'Use the equal sides',
        text: 'A rhombus has 4 equal sides, so a perimeter of 60 m means 60 ÷ 4 = 15 m per side. A parallelogram has equal opposite sides, so sides of 4 m and 3 m give a perimeter of 4 + 3 + 4 + 3 = 14 m.',
      },
    ],
  },
};

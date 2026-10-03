// Teaching Moment lessons for Grade 4 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G4 = {
  'g4-qpv-represent': {
    intro: 'Numbers up to 10\u00a0000 are built from thousands, hundreds, tens and ones. Where a digit sits tells you what it is worth. The blocks show 2416: 2 thousands, 4 hundreds, 1 ten and 6 ones.',
    introVisual: { type: 'base10', thousands: 2, hundreds: 4, tens: 1, ones: 6 },
    strategies: [
      {
        title: 'Use a place-value chart',
        text: 'Put one digit in each column: thousands, hundreds, tens, ones. In 3048, the 3 is worth 3000 and the 4 is worth 40. The 0 holds the hundreds place, so never skip it.',
        visual: { type: 'placevalue', columns: ['Thousands', 'Hundreds', 'Tens', 'Ones'], digits: [3, 0, 4, 8] },
      },
      {
        title: 'Expanded form and trading',
        text: 'Break a number into what each digit is worth: 5726 = 5000 + 700 + 20 + 6. You can also trade: 10 hundreds make 1 thousand, so 43 hundreds is 4300.',
      },
      {
        title: 'Compare from the left',
        text: 'Look at the thousands first. 6190 is greater than 5980 because 6 thousands is more than 5 thousands. If the thousands match, compare the hundreds, then the tens, then the ones.',
      },
      {
        title: 'Use benchmarks',
        text: '0, 2500, 5000, 7500 and 10\u00a0000 are handy landmarks. 4800 is between 2500 and 5000, and it is only 200 away from 5000, so it is closest to 5000.',
      },
    ],
  },

  'g4-qpv-fracdec': {
    intro: 'A fraction names equal parts of a whole: [[f:3/4]] is 3 of 4 equal parts, or [[f:1/4]] + [[f:1/4]] + [[f:1/4]]. Decimals are another way to write tenths and hundredths: [[f:7/10]] = 0.7 and [[f:25/100]] = 0.25. Knowing both helps you compare and estimate amounts.',
    strategies: [
      {
        title: 'Compare to 0, one half and 1',
        text: 'Ask: is it close to 0, [[f:1/2]] or 1? Half of 8 is 4, so [[f:5/8]] is a little more than [[f:1/2]], as the bars show. [[f:1/8]] is close to 0 and [[f:7/8]] is close to 1.',
        visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, color: 'orange', label: '[[f:1/2]]' }, { parts: 8, shaded: 5, color: 'orange', label: '[[f:5/8]]' }] },
      },
      {
        title: 'Equivalent fractions with bars',
        text: 'Line up fraction bars. [[f:3/4]] and [[f:6/8]] cover the same length, so they are equal. Multiply the top and the bottom by the same number: 3 × 2 = 6 and 4 × 2 = 8.',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 3, color: 'green', label: '[[f:3/4]]' }, { parts: 8, shaded: 6, color: 'green', label: '[[f:6/8]]' }] },
      },
      {
        title: 'Tenths and hundredths',
        text: 'Each column of the grid is one tenth and each small square is one hundredth. 4 columns are shaded: 4 tenths = 40 hundredths, so 0.4 = 0.40 = [[f:40/100]].',
        visual: { type: 'hundredgrid', shaded: 40 },
      },
      {
        title: 'Add a zero to compare decimals',
        text: 'Give both decimals two places: 0.6 becomes 0.60. Now compare 60 hundredths and 45 hundredths: 0.6 is greater than 0.45. More digits does not mean bigger!',
      },
    ],
  },

  'g4-qpv-count': {
    intro: 'Counting means moving along the number line in equal jumps. You can count by 25s, 100s or 1000s, by tenths and hundredths, and even by fractions like fourths. Watch the digits when you cross a hundred, a thousand or a whole! The jumps show counting by 250s.',
    introVisual: { type: 'numberline', min: 1500, max: 2250, ticks: 250, jumps: [{ from: 1500, to: 1750, label: '+250' }, { from: 1750, to: 2000, label: '+250' }, { from: 2000, to: 2250, label: '+250' }] },
    strategies: [
      {
        title: 'Skip count with jumps',
        text: 'Each jump adds the same amount. Counting by 250s: 1500, 1750, 2000, 2250. Counting back takes the same jump away each time: 2250, 2000, 1750.',
      },
      {
        title: 'Watch the place that changes',
        text: 'Counting by 100s, only the hundreds digit changes: 3700, 3800, 3900. After 9 hundreds comes the next thousand: 3900 + 100 = 4000.',
      },
      {
        title: 'Count by tenths and hundredths',
        text: 'By tenths: 0.8, 0.9, then 10 tenths make 1 whole, then 1.1. The bars show 1.1: one whole bar plus 1 tenth. By hundredths: 0.48, 0.49, then 0.50, because 10 hundredths make 1 tenth.',
        visual: { type: 'fractionbar', bars: [{ parts: 10, shaded: 10, color: 'teal' }, { parts: 10, shaded: 1, color: 'teal' }] },
      },
      {
        title: 'Count fractions past 1',
        text: 'Counting by fourths: [[f:3/4]], [[f:4/4]], [[f:5/4]], [[f:6/4]]. The top number goes up by 1 and the bottom stays 4. [[f:4/4]] is 1 whole, so [[f:5/4]] is 1 whole and [[f:1/4]] more, like the bars.',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 4, color: 'purple', label: '[[f:4/4]]' }, { parts: 4, shaded: 1, color: 'purple', label: '[[f:1/4]]' }] },
      },
    ],
  },

  'g4-ops-addsub': {
    intro: 'Adding joins amounts together. Subtracting finds what is left or how far apart two numbers are. With numbers up to 10\u00a0000, keep each place lined up. Tenths work the same way. The bar model shows a whole, 5000, made of two parts: 2780 and a missing part.',
    introVisual: { type: 'barmodel', whole: 5000, parts: [2780, '?'] },
    strategies: [
      {
        title: 'Line up and regroup',
        text: 'Line up the places and start with the ones. In 3658 + 1275, 8 + 5 = 13 ones: write 3 and regroup 1 ten. Keep going to get 4933. When subtracting, trade 1 from the next place if a top digit is too small.',
        visual: { type: 'table', headers: ['', 'Th', 'H', 'T', 'O'], rows: [['', 3, 6, 5, 8], ['+', 1, 2, 7, 5], ['=', 4, 9, 3, 3]] },
      },
      {
        title: 'Count up to subtract',
        text: 'For 5000 − 2780, like the bar model above, count up from 2780: +20 makes 2800, +200 makes 3000, +2000 makes 5000. The jumps add to 2220, so the missing part is 2220.',
      },
      {
        title: 'Estimate first',
        text: 'Round each number to the nearest thousand. 4870 is closer to 5000 than to 4000, and 2190 is about 2000. So 4870 + 2190 is about 7000. If your answer is far from 7000, check again. For tenths, round to whole numbers: 3.8 + 2.1 is about 4 + 2 = 6.',
      },
      {
        title: 'Add tenths in parts',
        text: 'For 3.6 + 2.7, add the whole number first: 3.6 + 2 = 5.6. Then add the tenths: 5.6 + 0.7 = 6.3. Or think 36 tenths + 27 tenths = 63 tenths = 6.3.',
      },
    ],
  },

  'g4-ops-muldiv': {
    intro: 'Multiplying puts equal groups together: 4 × 6 means 4 groups of 6, and “3 times as many as 5” means 3 × 5. Dividing splits a total into equal groups. They are opposites, so every times fact gives you division facts too.',
    introVisual: { type: 'groups', groups: 4, each: 6 },
    strategies: [
      {
        title: 'Add or take away a group',
        text: 'Start from an easy fact. 5 × 7 = 35, so 6 × 7 is one more group of 7: 35 + 7 = 42. And 10 × 7 = 70, so 9 × 7 is one group less: 70 − 7 = 63.',
      },
      {
        title: 'Double it',
        text: 'Twice as many groups means double the answer. 3 × 7 = 21, so 6 × 7 = 21 + 21 = 42. And 2 × 8 = 16, so 4 × 8 = 16 + 16 = 32.',
      },
      {
        title: 'Split the array',
        text: '7 groups of 6 can be split into 5 groups of 6 and 2 groups of 6: 5 × 6 + 2 × 6 = 30 + 12 = 42. Splitting and adding like this is called the distributive property.',
        visual: { type: 'array', rows: 6, cols: 7, split: 5 },
      },
      {
        title: 'Divide by thinking multiply',
        text: '35 ÷ 5 asks: 5 times what makes 35? 5 × 7 = 35, so 35 ÷ 5 = 7. Remember: switching the order keeps the product (3 × 5 = 5 × 3), and any number times 0 is 0.',
      },
    ],
  },

  'g4-ops-facts': {
    intro: 'Times facts are tools you can grab quickly. You do not have to learn every fact on its own: you can build the harder facts from easy ones like 2s, 5s and 10s. The more you use them, the faster they get!',
    strategies: [
      {
        title: 'Nines: 10 groups take away 1',
        text: 'For 9 × 6, find 10 × 6 = 60, then take away one group of 6: 60 − 6 = 54. In the array, the orange column is the extra group you take away.',
        visual: { type: 'array', rows: 6, cols: 10, split: 9 },
      },
      {
        title: 'Fours and eights: double',
        text: 'For 4 × 7, double 7 to get 14, then double again to get 28. For 8 × 7, double one more time: 28 + 28 = 56.',
      },
      {
        title: 'Threes and sixes: add a group',
        text: 'For 3 × 8, find 2 × 8 = 16 and add one more 8: 24. For 6 × 8, find 5 × 8 = 40 and add one more 8: 48. Or double 3 × 8: 24 + 24 = 48.',
      },
      {
        title: 'Sevens: split into 5 and 2',
        text: 'For 7 × 4, split the 7 into 5 and 2: 5 × 4 = 20 and 2 × 4 = 8, so 7 × 4 = 28. To divide, use the fact backwards: 28 ÷ 7 = 4.',
        visual: { type: 'array', rows: 4, cols: 7, split: 5 },
      },
    ],
  },

  'g4-ops-multidigit': {
    intro: 'Bigger multiplying and dividing uses the facts you already know. Break the big number into hundreds, tens and ones, work with each part, then put the answers together.',
    strategies: [
      {
        title: 'Split into place-value parts',
        text: 'For 6 × 314, split 314 into 300 + 10 + 4. Multiply each part by 6: 1800, 60 and 24. Then add: 1800 + 60 + 24 = 1884.',
        visual: { type: 'table', headers: ['×', '300', '10', '4'], rows: [['6', '1800', '60', '24']] },
      },
      {
        title: 'Estimate to check',
        text: 'Round to the nearest hundred: 6 × 314 is about 6 × 300 = 1800. The answer 1884 is close to 1800, so it makes sense. To estimate 58 ÷ 3, use a friendly number: 60 ÷ 3 = 20, so the answer is about 20.',
      },
      {
        title: 'Divide tens, then ones',
        text: 'For 84 ÷ 4, split 84 into 80 + 4. Share the tens: 80 ÷ 4 = 20. Share the ones: 4 ÷ 4 = 1. So 84 ÷ 4 = 20 + 1 = 21.',
        visual: { type: 'base10', tens: 8, ones: 4 },
      },
      {
        title: 'Remainders are leftovers',
        text: 'For 47 ÷ 5, count by 5s as far as you can: 45 is 9 groups. 47 − 45 = 2 are left over, so 47 ÷ 5 = 9 R 2. Check: 5 × 9 + 2 = 47.',
      },
    ],
  },

  'g4-pat-equations': {
    intro: 'An equation says both sides are equal, like a level balance. A symbol such as □, ★ or ? stands for a missing number. Here, 2 × 9 = 18, and 3 × 6 = 18, so the ? is 6.',
    introVisual: { type: 'balance', left: '3 × ?', right: '2 × 9', tilt: 'level' },
    strategies: [
      {
        title: 'Use the opposite operation',
        text: '□ × 6 = 42 asks: what times 6 makes 42? Divide: 42 ÷ 6 = 7, so □ = 7. For □ ÷ 3 = 8, multiply instead: 3 × 8 = 24, so □ = 24.',
      },
      {
        title: 'Use a fact family',
        text: '4, 9 and 36 make a family: 4 × 9 = 36, 9 × 4 = 36, 36 ÷ 4 = 9 and 36 ÷ 9 = 4. If you know one fact, you know them all. So in 36 ÷ ★ = 9, the ★ is 4.',
      },
      {
        title: 'Check by putting it in',
        text: 'Put your number in place of the symbol and work it out. Is ▲ = 6 right for 48 ÷ ▲ = 8? 48 ÷ 6 = 8. Both sides match, so yes!',
      },
      {
        title: 'Turn a story into an equation',
        text: 'Equal groups put together means ×, and sharing or making groups means ÷. 5 bags hold 30 marbles, with the same number in each: 5 × □ = 30, so □ = 6.',
        visual: { type: 'barmodel', whole: 30, parts: ['?', '?', '?', '?', '?'] },
      },
    ],
  },

  'g4-pat-tables': {
    intro: 'A pattern in a table follows a rule. When you find how the numbers change, you can fill in missing numbers, spot mistakes and predict what comes next. A Venn diagram sorts numbers using two rules, like the one in the picture.',
    introVisual: { type: 'venn', leftLabel: 'Multiples of 2', rightLabel: 'Multiples of 5', left: [4, 8], both: [10, 20], right: [15, 25], outside: [7] },
    strategies: [
      {
        title: 'Find how much it grows',
        text: 'Look at the jump from one row to the next. 1 spider has 8 legs, 2 spiders have 16, 3 spiders have 24. The legs go up by 8 each row, so 4 spiders have 24 + 8 = 32 legs.',
        visual: { type: 'table', headers: ['Spiders', 'Legs'], rows: [[1, 8], [2, 16], [3, 24], [4, '?']] },
      },
      {
        title: 'Find the rule for any row',
        text: 'Link the two columns: legs = spiders × 8. Now 10 spiders have 10 × 8 = 80 legs, without counting row by row. Some rules have two steps, like “multiply by 3, then add 1”: 1 → 4, 2 → 7, 3 → 10.',
      },
      {
        title: 'Check every jump',
        text: 'To find a mistake, check each jump. In this table the arms go 5, 10, 15, 21, 25. The jump from 15 to 21 is 6, not 5. So 21 is wrong: it should be 20.',
        visual: { type: 'table', headers: ['Starfish', 'Arms'], rows: [[1, 5], [2, 10], [3, 15], [4, 21], [5, 25]] },
      },
      {
        title: 'Sort with a Venn diagram',
        text: 'Ask two questions: does it fit the left label? Does it fit the right label? Yes to both goes in the middle, and no to both goes outside. 10 is a multiple of 2 and of 5, so it goes in the middle. 7 fits neither label, so it is outside.',
      },
    ],
  },

  'g4-meas-time': {
    intro: 'The 24-hour clock counts the hours from 00 at midnight up to 23, so you do not need a.m. or p.m. Bus, train and plane schedules use it. Time units connect too: 60 seconds make 1 minute, and 60 minutes make 1 hour.',
    strategies: [
      {
        title: 'Afternoon: add or take away 12',
        text: 'After noon, add 12 to the hour: 3:30 p.m. is 15:30. To go back to 12-hour time, take away 12: 19:45 is 7:45 p.m. The minutes never change.',
        visual: { type: 'clock', hour: 15, minute: 30, digital: 'both', h24: true },
      },
      {
        title: 'Morning: use two digits',
        text: 'Morning hours stay the same, written with two digits: 8:05 a.m. is 08:05. Careful with 12: midnight (12 a.m.) is 00:00, and noon (12 p.m.) is 12:00.',
      },
      {
        title: 'Compare the hours first',
        text: 'In 24-hour time, a bigger hour is later in the day. 09:40 comes before 14:05, and 14:05 comes before 21:15. If two hours match, compare the minutes.',
        visual: { type: 'table', title: 'Bus Schedule', headers: ['To', 'Leaves at'], rows: [['Moncton', '09:40'], ['Bathurst', '14:05'], ['Shediac', '21:15']] },
      },
      {
        title: 'Change units by 60s',
        text: 'Each hour is 60 minutes, so 3 hours = 3 × 60 = 180 minutes, and 2 h 15 min = 120 + 15 = 135 minutes. Each minute is 60 seconds, and each day is 24 hours.',
      },
    ],
  },

  'g4-meas-measure': {
    intro: 'Perimeter is the distance around a shape. Area is how many squares cover the inside. Capacity is how much a container holds, in millilitres (mL) or litres (L). The shaded rectangle is 5 units long and 3 units wide.',
    introVisual: { type: 'grid', cols: 7, rows: 5, rect: { x: 1, y: 1, w: 5, h: 3 }, showUnits: true },
    strategies: [
      {
        title: 'Perimeter: add all the sides',
        text: 'Trace around the outside and add every side. A rectangle 5 cm long and 3 cm wide has a perimeter of 5 + 3 + 5 + 3 = 16 cm.',
      },
      {
        title: 'Area: rows times columns',
        text: 'Count the squares inside, or multiply. The 5 by 3 rectangle has 3 rows of 5 squares: 3 × 5 = 15 squares. If each square is 1 cm², the area is 15 cm². Big areas use m².',
      },
      {
        title: 'Same perimeter, different area',
        text: 'Rectangles can have the same perimeter but different areas. A 6 by 2 rectangle and a 4 by 4 square both have a perimeter of 16 units. But their areas are 12 and 16 square units.',
        visual: { type: 'grid', cols: 12, rows: 5, cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [7, 1], [8, 1], [9, 1], [10, 1], [7, 2], [8, 2], [9, 2], [10, 2], [7, 3], [8, 3], [9, 3], [10, 3], [7, 4], [8, 4], [9, 4], [10, 4]] },
      },
      {
        title: 'Capacity: 1 L = 1000 mL',
        text: 'Use mL for small amounts: a juice box holds about 200 mL. Use L for big amounts: a bucket holds about 10 L. 1 L = 1000 mL, so this jug with 500 mL holds half a litre.',
        visual: { type: 'jug', value: 500, max: 1000, unit: 'mL', ticks: 100 },
      },
    ],
  },

  'g4-geo-polygons': {
    intro: 'A shape is symmetrical when a line splits it into two halves that match exactly, like a mirror image. Two shapes are congruent when they are exactly the same shape and the same size, even if one is turned or flipped.',
    strategies: [
      {
        title: 'Do the fold test',
        text: 'Imagine folding the shape along the dashed line. If one half lands exactly on the other half, it is a line of symmetry. This heart folds up-and-down into two matching halves.',
        visual: { type: 'symmetry', shape: 'heart', line: 'vertical' },
      },
      {
        title: 'Try every fold',
        text: 'Try up-and-down, side-to-side and corner-to-corner folds. A rectangle has 2 lines of symmetry: up-and-down and side-to-side. Its corner-to-corner line does NOT work, because the halves do not match.',
        visual: { type: 'symmetry', shape: 'rectangle', line: 'diagonal' },
      },
      {
        title: 'Regular polygons',
        text: 'In a regular polygon, all sides and all angles are equal. It has as many lines of symmetry as it has sides: a square has 4, an equilateral triangle has 3 and a regular hexagon has 6.',
      },
      {
        title: 'Congruent: same shape and size',
        text: 'Compare the shape and the size. Shape B is shape A turned around, so A and B are congruent. Shape C is the same shape but smaller, so it is NOT congruent.',
        visual: { type: 'shapes', items: [{ shape: 'trapezoid', size: 'm', color: 'blue', label: 'A' }, { shape: 'trapezoid', size: 'm', color: 'blue', rotate: 180, label: 'B' }, { shape: 'trapezoid', size: 's', color: 'blue', label: 'C' }] },
      },
    ],
  },

  'g4-data-data': {
    intro: 'Graphs show data so you can compare it quickly. In a pictograph, one picture can stand for many things, so always read the key. Data you collect yourself is first-hand; data someone else collected is second-hand.',
    introVisual: { type: 'bargraph', title: 'Birds Counted', labels: ['Robins', 'Crows', 'Blue jays'], values: [25, 40, 15], scale: 10, yLabel: 'Number of birds' },
    strategies: [
      {
        title: 'Read the key first',
        text: 'Here each book picture stands for 2 books. Monday has 4 pictures: 4 × 2 = 8 books. Tuesday has 2 and a half pictures. Half a picture is half of 2, which is 1, so Tuesday is 4 + 1 = 5 books.',
        visual: { type: 'pictograph', title: 'Books Borrowed', icon: '📘', key: 2, rows: [{ label: 'Monday', count: 8 }, { label: 'Tuesday', count: 5 }, { label: 'Wednesday', count: 6 }] },
      },
      {
        title: 'Read bars on the scale',
        text: 'Follow the end of each bar across to the numbers. In the bar graph above, the lines count by 10s. The Robins bar stops halfway between 20 and 30, so it shows 25.',
      },
      {
        title: 'Subtract to compare, add for all',
        text: 'For “how many more”, find both numbers and subtract: 40 crows − 25 robins = 15 more crows. For “how many in all”, add every number: 25 + 40 + 15 = 80 birds.',
      },
      {
        title: 'First-hand or second-hand?',
        text: 'Ask: who collected the data? If you count, measure or ask people yourself, it is first-hand data. If it comes from a book, a website or a newspaper, it is second-hand data.',
      },
    ],
  },

  'g4-data-chance': {
    intro: 'Chance tells how likely something is to happen. When every outcome has the same chance, like heads or tails on a coin, the outcomes are equally likely. Coins, dice and spinners help us think about chance.',
    strategies: [
      {
        title: 'List the outcomes',
        text: 'An outcome is one possible result. A coin has 2 outcomes: heads and tails. A die has 6 outcomes: 1, 2, 3, 4, 5 and 6. A spinner has one outcome for each section.',
        visual: { type: 'dice', values: [1, 2, 3, 4, 5, 6] },
      },
      {
        title: 'Compare section sizes',
        text: 'On a spinner, a bigger section means a better chance. Here the blue section is bigger than red or yellow, so blue is more likely. If all sections are the same size, every colour is equally likely.',
        visual: { type: 'spinner', sections: [{ color: 'blue', label: 'Blue', size: 2 }, { color: 'red', label: 'Red', size: 1 }, { color: 'yellow', label: 'Yellow', size: 1 }] },
      },
      {
        title: 'Can both happen?',
        text: 'One roll of a die shows only one number. So rolling a 2 and rolling a 5 can NOT both happen. Rolling a 4 and rolling an even number can both happen, because 4 is even.',
      },
      {
        title: 'Each try is brand new',
        text: 'A coin has no memory. After 5 heads in a row, heads and tails are still equally likely. In 20 flips, expect about half to be heads, so about 10. It may not be exactly 10, but it should be close.',
      },
    ],
  },

  'g4-data-money': {
    intro: 'Canadian money uses coins (nickels, dimes, quarters, loonies and toonies) and bills ($5, $10, $20, $50 and $100). We write amounts with dollars before the decimal point and cents after it, like $5.25. You can earn money by working or selling things.',
    introVisual: { type: 'coins', items: ['bill20', 'bill10', 'toonie', 'quarter', 'dime'] },
    strategies: [
      {
        title: 'Count the biggest first',
        text: 'Start with the bill or coin worth the most, then count on: $20, $30, $32, $32.25, $32.35. So the money in the picture above is $32.35.',
      },
      {
        title: 'Write it the right way',
        text: 'Cents always use two digits: five dollars and seven cents is $5.07, not $5.7. In French it is written 5,07 $: a comma instead of the point, and the $ at the end after a space.',
        visual: { type: 'expression', text: '$5.07 = 5,07 $' },
      },
      {
        title: 'Use the fewest pieces',
        text: 'Use the biggest bill or coin that fits, as many times as you can, then the next biggest. $45 is $20 + $20 + $5: just 3 bills.',
        visual: { type: 'coins', items: ['bill20', 'bill20', 'bill5'] },
      },
      {
        title: 'Add dollars, then cents',
        text: 'For $12.50 + $7.75, add the dollars (19) and the cents (125¢). 125¢ = $1.25, so the total is $20.25. To find how much more you need, count up: from $15 to $22.50 is $7.50.',
      },
    ],
  },

  'g4-classic-decimals': {
    intro: 'Decimals with hundredths are used for money and measuring, like $3.45 or 2.75 m. Adding and subtracting them works just like whole numbers, as long as you line up the decimal points. The chart shows 2.46 + 1.38 = 3.84, lined up place by place.',
    introVisual: { type: 'table', headers: ['', 'Ones', 'Tenths', 'Hundredths'], rows: [['', '2', '4', '6'], ['+', '1', '3', '8'], ['=', '3', '8', '4']] },
    strategies: [
      {
        title: 'Line up the decimal points',
        text: 'Keep ones under ones, tenths under tenths and hundredths under hundredths. For 2.46 + 1.38 in the chart above, 6 + 8 = 14 hundredths: write 4 and regroup 1 tenth. Then 4 + 3 + 1 = 8 tenths and 2 + 1 = 3 ones: 3.84.',
      },
      {
        title: 'Think in hundredths',
        text: 'Turn decimals into hundredths. 5.00 is 500 hundredths and 1.75 is 175 hundredths. 500 − 175 = 325 hundredths, so 5.00 − 1.75 = 3.25.',
      },
      {
        title: 'Make a whole',
        text: 'Two decimals that make 100 hundredths add to exactly 1. The grid shows 0.35 shaded, and the 65 empty squares are 0.65. So 0.35 + 0.65 = 1.',
        visual: { type: 'hundredgrid', shaded: 35 },
      },
      {
        title: 'Estimate to check',
        text: 'Round each decimal to the nearest whole number. 4.82 + 2.17 is about 5 + 2 = 7. The exact answer, 6.99, is close to 7, so it makes sense.',
      },
    ],
  },

  'g4-classic-dates': {
    intro: 'The same date can be written in different ways: March 5, 2027, or 5 March 2027, or with numbers like 2027/03/05. The format tells you which number is the year, which is the month and which is the day.',
    strategies: [
      {
        title: 'Read the calendar',
        text: 'Find the day number, then go straight up its column to the day name at the top. March 5, 2027 is in the Fri column, so it is a Friday.',
        visual: { type: 'calendar', month: 3, year: 2027, highlight: [5] },
      },
      {
        title: 'Follow the format letters',
        text: 'yyyy is the 4-digit year, mm is the month and dd is the day, each with 2 digits. Count months from January = 01, so March is 03. March 5, 2027 is 2027/03/05 in yyyy/mm/dd.',
        visual: { type: 'table', headers: ['Format', 'March 5, 2027'], rows: [['yyyy/mm/dd', '2027/03/05'], ['dd/mm/yyyy', '05/03/2027'], ['mm/dd/yyyy', '03/05/2027']] },
      },
      {
        title: 'Watch out for mix-ups',
        text: '03/05/2027 could mean March 5 (mm/dd/yyyy) or May 3 (dd/mm/yyyy). Always check the format before you read a date written in numbers.',
      },
      {
        title: 'Count on past the month end',
        text: 'Know how many days the month has. For 1 week after April 28, count 7 days. April has 30 days, so after April 30 keep counting into May: you land on May 5.',
      },
    ],
  },
};

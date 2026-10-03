// Teaching Moment lessons for Grade 2 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G2 = {
  'g2-qpv-represent': {
    intro: 'Numbers to 200 are built from hundreds, tens and ones. The blocks show 136: 1 hundred, 3 tens and 6 ones. When you know the places, you can read, write, compare and estimate big numbers. Even or odd? Make pairs: if every one has a partner, it is even. Even numbers end in 0, 2, 4, 6 or 8.',
    introVisual: { type: 'base10', hundreds: 1, tens: 3, ones: 6 },
    strategies: [
      {
        title: 'Read the places',
        text: 'Read hundreds, then tens, then ones. If a place is empty, write 0 to hold it. 1 hundred, 0 tens and 5 ones is 105, not 15.',
        visual: { type: 'placevalue', columns: ['Hundreds', 'Tens', 'Ones'], digits: [1, 0, 5] },
      },
      {
        title: '10 tens make 1 hundred',
        text: 'You can trade 1 hundred for 10 tens. So 136 is also 13 tens and 6 ones. And 20 tens is 200.',
      },
      {
        title: 'Compare the biggest place first',
        text: 'Compare hundreds first, then tens, then ones. 128 and 182 both have 1 hundred. 2 tens is less than 8 tens, so 128 < 182. The open side faces the bigger number.',
      },
      {
        title: 'Find the nearest ten',
        text: 'Find the tens on each side. 47 is between 40 and 50. It is 3 jumps from 50 and 7 jumps from 40, so 47 is closest to 50.',
        visual: { type: 'numberline', min: 40, max: 50, ticks: 1, labels: [40, 50], marks: [{ value: 47, label: '47' }] },
      },
    ],
  },

  'g2-qpv-fractions': {
    intro: 'A fraction names equal parts of a whole. Cut a whole into 2 equal parts and each part is one half. 3 equal parts are thirds, and 4 equal parts are fourths. The parts must be the same size!',
    introVisual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, label: 'halves' }, { parts: 3, shaded: 1, label: 'thirds' }, { parts: 4, shaded: 1, label: 'fourths' }] },
    strategies: [
      {
        title: 'Count all parts, then shaded',
        text: 'First count all the equal parts. That tells you halves, thirds or fourths. Then count the shaded parts and say that number first. 4 equal parts with 3 shaded is three fourths.',
        visual: { type: 'fractioncircle', parts: 4, shaded: 3, color: 'blue' },
      },
      {
        title: 'More parts, smaller pieces',
        text: 'Look at the bars at the top. When the wholes are the same size, more parts means smaller pieces. One half is bigger than one third, and one third is bigger than one fourth.',
      },
      {
        title: 'Share into equal groups',
        text: 'To find one third of 12, share the 12 into 3 equal groups, one at a time. Each group has 4, so one third of 12 is 4.',
        visual: { type: 'groups', groups: 3, each: 4, icon: '🍎' },
      },
      {
        title: 'Count past one whole',
        text: 'Count by fourths: one fourth, two fourths, three fourths, four fourths. Four fourths make 1 whole! Keep going: five fourths is 1 whole and one fourth.',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 4, color: 'green' }, { parts: 4, shaded: 1, color: 'green' }] },
      },
    ],
  },

  'g2-qpv-count': {
    intro: 'Counting helps you find how many, and where a number lives. You can count on or back by 1s, skip count by 2s, 5s and 10s, and use words like first, second and third to tell a place in line.',
    strategies: [
      {
        title: 'Careful at a new ten or hundred',
        text: 'When you count by 1s, slow down when you cross a ten or a hundred. Count on: 98, 99, 100, 101. Count back: 102, 101, 100, 99.',
        visual: { type: 'numberline', min: 97, max: 103, ticks: 1, labels: 'all' },
      },
      {
        title: 'Skip count with equal jumps',
        text: 'Each jump is the same size. By 5s: 35, 40, 45, 50. By 10s from any number, only the tens digit changes: 23, 33, 43, 53.',
        visual: { type: 'numberline', min: 23, max: 53, ticks: 10, labels: 'all', jumps: [{ from: 23, to: 33, label: '+10' }, { from: 33, to: 43, label: '+10' }, { from: 43, to: 53, label: '+10' }] },
      },
      {
        title: '10 more, 10 less',
        text: 'On a hundred chart, 10 more is one row down and 10 less is one row up. 10 more than 46 is 56. 10 less than 46 is 36. The ones digit stays the same.',
        visual: { type: 'hundredchart', highlight: [36, 46, 56] },
      },
      {
        title: 'Say the places in order',
        text: 'Start at the front. Touch each one and say first, second, third, fourth. The star is fourth, so 3 kids are in front of it.',
        visual: { type: 'pattern', items: ['🧒', '🧒', '🧒', '⭐', '🧒', '🧒'] },
      },
    ],
  },

  'g2-ops-addsub': {
    intro: 'Adding puts amounts together. Subtracting takes some away or finds the difference. With numbers to 100, split a number into tens and ones, and make jumps you can do in your head.',
    strategies: [
      {
        title: 'Add the tens, then the ones',
        text: 'Keep the first number whole. 46 + 32: jump 3 tens: 56, 66, 76. Then add 2 ones: 77, 78. So 46 + 32 = 78.',
        visual: { type: 'numberline', min: 40, max: 80, ticks: 10, labels: 'all', jumps: [{ from: 46, to: 56, label: '+10' }, { from: 56, to: 66, label: '+10' }, { from: 66, to: 76, label: '+10' }, { from: 76, to: 78, label: '+2' }] },
      },
      {
        title: 'Make a friendly ten',
        text: 'Move a little from one number to the other to make a ten. 38 + 25: take 2 from 25 to turn 38 into 40. Now it is 40 + 23 = 63.',
      },
      {
        title: 'Count up to subtract',
        text: 'Think addition. 72 − 45: count up from 45. 45 to 50 is 5. 50 to 70 is 20. 70 to 72 is 2. 5 + 20 + 2 = 27, so 72 − 45 = 27.',
        visual: { type: 'numberline', min: 45, max: 72, ticks: 1, labels: [45, 50, 60, 70, 72], jumps: [{ from: 45, to: 50, label: '+5' }, { from: 50, to: 70, label: '+20' }, { from: 70, to: 72, label: '+2' }] },
      },
      {
        title: 'Draw a bar model',
        text: 'In a story, find the whole and the parts. Know both parts? Add. Know the whole and one part? Subtract. 60 flowers, 25 are red: 60 − 25 = 35 are blue.',
        visual: { type: 'barmodel', whole: 60, parts: [25, '?'], labels: ['red', 'blue'] },
      },
    ],
  },

  'g2-ops-facts': {
    intro: 'Fact Power means knowing addition and subtraction facts to 20 quickly, without counting one by one. Use facts you already know, like doubles and ten, to figure out new ones.',
    strategies: [
      {
        title: 'Make ten',
        text: '8 + 5: 8 needs 2 more to make 10. Take 2 from the 5. Now it is 10 + 3 = 13.',
        visual: { type: 'tenframe', count: 8, count2: 5 },
      },
      {
        title: 'Doubles and near doubles',
        text: 'Doubles are easy to remember: 6 + 6 = 12. For 6 + 7, think 6 + 6 = 12, then 1 more is 13.',
        visual: { type: 'rekenrek', top: 6, bottom: 7 },
      },
      {
        title: 'Think addition',
        text: 'To subtract, use an addition fact. 14 − 6: what goes with 6 to make 14? 6 + 8 = 14, so 14 − 6 = 8.',
        visual: { type: 'numberbond', whole: 14, parts: [6, '?'] },
      },
      {
        title: 'Back to ten',
        text: 'Subtract in two small steps. 15 − 7: take away 5 to get to 10. Then take away 2 more to get 8. So 15 − 7 = 8.',
        visual: { type: 'numberline', min: 5, max: 15, ticks: 1, labels: [5, 10, 15], jumps: [{ from: 15, to: 10, label: '−5' }, { from: 10, to: 8, label: '−2' }] },
      },
    ],
  },

  'g2-pat-patterns': {
    intro: 'A pattern follows a rule. A repeating pattern has a core, the part that repeats over and over. A growing pattern gets bigger by the same amount each time. Find the rule, and you can tell what comes next.',
    strategies: [
      {
        title: 'Find the core',
        text: 'Say the pattern out loud and listen for where it starts again: star, star, heart, circle, star, star, heart, circle. The core is star, star, heart, circle. So next is star!',
        visual: { type: 'pattern', items: [{ shape: 'star', color: 'yellow' }, { shape: 'star', color: 'yellow' }, { shape: 'heart', color: 'red' }, { shape: 'circle', color: 'blue' }, { shape: 'star', color: 'yellow' }, { shape: 'star', color: 'yellow' }, { shape: 'heart', color: 'red' }, { shape: 'circle', color: 'blue' }, '?'], highlightCore: 4 },
      },
      {
        title: 'Name it with letters',
        text: 'Give the first item the letter A. Each new item gets the next letter. Star, star, heart, circle is A A B C. Two patterns with the same letters have the same core.',
      },
      {
        title: 'Find the jump',
        text: 'In a growing pattern, find how many more each step adds. These steps have 2, 4 and 6 squares. Each step adds 2, so the next step has 8. Numbers work the same way: 15, 20, 25, 30 jumps by 5.',
        visual: { type: 'growing', steps: [2, 4, 6, 8], shape: 'square', blankLast: true },
      },
      {
        title: 'Check every spot',
        text: 'To find a mistake, check each item against the core or the jump, one at a time. In 10, 12, 14, 17, 18 the jump is 2, so 17 should be 16.',
      },
    ],
  },

  'g2-pat-unknown': {
    intro: 'A mystery number is hiding in the box. The equal sign means both sides have the same amount. Think about parts and wholes to find the number in the box.',
    strategies: [
      {
        title: 'Is the box a part or the whole?',
        text: 'In □ + 30 = 50, the whole is 50 and the box is a part. To find a part, take the other part away from the whole: 50 − 30 = 20. To find a whole, add the parts.',
        visual: { type: 'numberbond', whole: 50, parts: ['?', 30] },
      },
      {
        title: 'Count up',
        text: 'For 45 + □ = 70, count up from 45 to 70. 45 to 50 is 5. 50 to 70 is 20. 5 + 20 = 25, so the box is 25.',
        visual: { type: 'numberline', min: 45, max: 70, ticks: 5, labels: 'all', jumps: [{ from: 45, to: 50, label: '+5' }, { from: 50, to: 70, label: '+20' }] },
      },
      {
        title: 'Any order, and zero',
        text: 'You can add in any order: 8 + 5 = 5 + 8. So for 7 + 4 + 3, add 7 + 3 = 10 first, then 10 + 4 = 14. Adding or taking away 0 changes nothing: 27 + 0 = 27. But order matters when you subtract.',
      },
      {
        title: 'Make both sides balance',
        text: 'Both sides of = must be the same. For 6 + □ = 4 + 5, first add the side with no box: 4 + 5 = 9. 6 + 3 = 9, so the box is 3.',
        visual: { type: 'balance', left: '6 + ?', right: '4 + 5', tilt: 'level' },
      },
    ],
  },

  'g2-meas-time': {
    intro: 'Seconds and minutes tell how long something takes. A second is very short, about as long as saying “one steamboat”. A minute is longer. 60 seconds make 1 minute, like counting by tens to 60.',
    introVisual: { type: 'numberline', min: 0, max: 60, ticks: 10, labels: 'all', jumps: [{ from: 0, to: 10, label: '+10' }, { from: 10, to: 20, label: '+10' }, { from: 20, to: 30, label: '+10' }, { from: 30, to: 40, label: '+10' }, { from: 40, to: 50, label: '+10' }, { from: 50, to: 60, label: '+10' }] },
    strategies: [
      {
        title: 'Use a time buddy',
        text: 'Say “one steamboat”. That is about 1 second, like a clap or a blink. Counting slowly to 60 takes about 1 minute, like washing your hands well.',
      },
      {
        title: 'Seconds or minutes?',
        text: 'Is it over in a flash? Use seconds, like for a sneeze or a jump. Does it take a while? Use minutes, like for eating lunch or having a bath.',
      },
      {
        title: 'Change minutes to seconds',
        text: 'Each minute is 60 seconds. 2 minutes is 60 + 60 = 120 seconds. Now you can compare: 90 seconds is less than 2 minutes, because 90 is less than 120.',
        visual: { type: 'barmodel', whole: 120, parts: [60, 60], labels: ['1 minute', '1 minute'] },
      },
      {
        title: 'Minutes and seconds',
        text: '1 minute and 20 seconds is 60 + 20 = 80 seconds. To go back, take away 60: 80 − 60 = 20, so 80 seconds is 1 minute and 20 seconds.',
      },
    ],
  },

  'g2-meas-length': {
    intro: 'Length tells how long something is. We measure small things in centimetres (cm). A centimetre is about as wide as your fingernail. A decimetre (dm) is 10 centimetres, about as wide as your hand.',
    strategies: [
      {
        title: 'Start at 0',
        text: 'Line up one end of the object with the 0 on the ruler. Read the number at the other end. This pencil ends at 8, so it is 8 cm long.',
        visual: { type: 'ruler', length: 10, object: 'pencil', objectLength: 8, start: 0, unit: 'cm' },
      },
      {
        title: 'Not at 0? Count the spaces',
        text: 'This crayon starts at 3. Count the centimetre spaces from 3 to its end, not the lines. Or take away: it ends at 10, so 10 − 3 = 7 cm.',
        visual: { type: 'ruler', length: 11, object: 'crayon', objectLength: 7, start: 3, unit: 'cm' },
      },
      {
        title: '10 cm make 1 dm',
        text: 'Count by tens to change decimetres to centimetres. 3 dm is 10, 20, 30 cm. A ten-rod from the base-ten blocks is 10 cm long, so it is 1 dm.',
        visual: { type: 'base10', hundreds: 0, tens: 3, ones: 0 },
      },
      {
        title: 'Smaller unit, bigger number',
        text: 'Measure a desk with paper clips, then with shoes. Paper clips are smaller, so you need more of them. The smaller the unit, the bigger the number you count.',
      },
    ],
  },

  'g2-geo-shapes': {
    intro: 'Shapes are named by their sides and corners, not by colour, size or which way they are turned. All three of these are triangles! Solids are 3-D shapes you can hold, like a cube or a can.',
    introVisual: { type: 'shapes', items: [{ shape: 'triangle', color: 'red', size: 's' }, { shape: 'right_triangle', color: 'blue', size: 'l', rotate: 90 }, { shape: 'scalene_triangle', color: 'green', size: 'm', rotate: 200, pattern: 'stripes' }] },
    strategies: [
      {
        title: 'Count sides and corners',
        text: 'Put your finger on one side and go around, counting each side once. 5 sides is a pentagon. 6 sides is a hexagon. A corner is where two sides meet.',
        visual: { type: 'shapes', items: [{ shape: 'pentagon', color: 'orange', label: 'pentagon' }, { shape: 'hexagon', color: 'purple', label: 'hexagon' }] },
      },
      {
        title: 'Look closely at 4 sides',
        text: 'A square has 4 equal sides and square corners. A rhombus has 4 equal sides but leans over. A trapezoid has 4 sides, and only 2 of them go the same way.',
        visual: { type: 'shapes', items: [{ shape: 'square', color: 'blue', label: 'square' }, { shape: 'rhombus', color: 'green', label: 'rhombus' }, { shape: 'trapezoid', color: 'red', label: 'trapezoid' }] },
      },
      {
        title: 'Faces, rolling and stacking',
        text: 'A face is a flat side. A cube has 6 square faces. A curved surface lets a solid roll. Flat faces on the top and bottom let it stack. A cylinder can do both!',
        visual: { type: 'solids', items: [{ solid: 'cube', color: 'blue', label: 'cube' }, { solid: 'cylinder', color: 'orange', label: 'cylinder' }, { solid: 'cone', color: 'green', label: 'cone' }] },
      },
      {
        title: 'Put shapes together',
        text: 'Shapes can fit together to make new shapes, like pattern blocks. 2 trapezoids make a hexagon. 6 triangles make a hexagon too!',
      },
    ],
  },

  'g2-data-data': {
    intro: 'Data is information we collect by asking a question. Tally charts and pictographs show the answers so they are easy to read. You can find the most, the least, how many more, and how many in all.',
    strategies: [
      {
        title: 'Count tallies by 5s',
        text: 'Each bundle of tally marks is 5. Count the bundles by fives, then count on the single marks. Dog has 2 bundles and 3 more: 5, 10, 11, 12, 13.',
        visual: { type: 'tally', title: 'Favourite Pet', rows: [{ label: '🐶 Dog', count: 13 }, { label: '🐱 Cat', count: 8 }, { label: '🐟 Fish', count: 5 }] },
      },
      {
        title: 'Read a pictograph',
        text: 'Find the row and count the pictures. Here each picture is 1 vote. The longest row is the most. The shortest row is the least.',
        visual: { type: 'pictograph', title: 'Favourite Fruit', rows: [{ label: '🍎 Apple', count: 6 }, { label: '🍌 Banana', count: 4 }, { label: '🍇 Grapes', count: 7 }], icon: '🙂', key: 1 },
      },
      {
        title: 'How many more?',
        text: 'To compare two rows, find the difference. In the fruit pictograph, Grapes has 7 and Banana has 4. Count up from 4 to 7: 5, 6, 7. That is 3 more.',
      },
      {
        title: 'How many in all?',
        text: 'Add every row. Look for an easy pair first. Apple 6 + Banana 4 = 10. Then 10 + Grapes 7 = 17 votes in all.',
      },
    ],
  },

  'g2-data-money': {
    intro: 'Canadian coins have different values. A nickel is 5¢, a dime is 10¢, a quarter is 25¢, a loonie is $1 and a toonie is $2. 100 cents make 1 dollar. The size of a coin does not tell its value!',
    introVisual: { type: 'coins', items: ['nickel', 'dime', 'quarter', 'loonie', 'toonie'] },
    strategies: [
      {
        title: 'Read the value, not the size',
        text: 'A dime is smaller than a nickel, but a dime is worth more! Read the number on each coin. From least to greatest: nickel, dime, quarter, loonie, toonie.',
      },
      {
        title: 'Skip count one kind of coin',
        text: 'Count dimes by 10s, nickels by 5s and quarters by 25s. 4 quarters: 25, 50, 75, 100. That is 100¢, or $1!',
        visual: { type: 'coins', items: ['quarter', 'quarter', 'quarter', 'quarter'] },
      },
      {
        title: 'Ways to make $1',
        text: '100¢ = $1. Count 10 dimes by tens: 10, 20, 30, all the way to 100. So 10 dimes make $1. So do 4 quarters, 20 nickels, or 1 loonie.',
      },
      {
        title: 'Count up to find change',
        text: 'An apple costs 65¢ and you pay $1. Count up from 65 to 100: 65 to 70 is 5, then 80, 90, 100 is 30 more. 5 + 30 = 35, so your change is 35¢.',
      },
    ],
  },

  'g2-classic-calendar': {
    intro: 'A calendar shows the days and months of the year. There are 7 days in a week and 12 months in a year. Calendars help you find dates and plan when things will happen.',
    strategies: [
      {
        title: 'Say them in order',
        text: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday. After Saturday, start again at Sunday. Months go around too: after December comes January.',
      },
      {
        title: 'Count by 7s for weeks',
        text: 'Each week has 7 days. 3 weeks is 7, 14, 21 days. 2 weeks and 3 days is 14 + 3 = 17 days.',
        visual: { type: 'numberline', min: 0, max: 21, ticks: 7, labels: 'all', jumps: [{ from: 0, to: 7, label: '+7' }, { from: 7, to: 14, label: '+7' }, { from: 14, to: 21, label: '+7' }] },
      },
      {
        title: 'Use the calendar columns',
        text: 'Find the date, then slide your finger up its column to the day name. The same day next week is one row down, 7 days later. One week after the 9th is the 16th.',
        visual: { type: 'calendar', month: 9, year: 2026, highlight: [9, 16] },
      },
      {
        title: 'Count on the months',
        text: 'Start at the month you know. Count on one finger for each month. 3 months after November: December, January, February. It is February.',
      },
    ],
  },
};

// Teaching Moment lessons for Grade 1 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G1 = {
  'g1-qpv-represent': {
    intro: 'Numbers tell how many. You can show a number in lots of ways: with dots, ten frames, blocks, or words, like 7 and "seven". When you know what a number looks like, you can read it, build it and compare it.',
    strategies: [
      {
        title: 'See it at a glance',
        text: 'You do not have to count small groups one by one. Look for a pattern you know, like dots on a dice. On a ten frame, a full row is 5. Here you see 5 and 2 more. That is 7.',
        visual: { type: 'tenframe', count: 7, frames: 1 },
      },
      {
        title: 'Count tens, then ones',
        text: 'Each rod is a ten. Each little cube is a one. Count the rods by tens: 10, 20, 30. Then count on the cubes by ones: 31, 32, 33, 34. So 3 tens and 4 ones is 34.',
        visual: { type: 'base10', hundreds: 0, tens: 3, ones: 4 },
      },
      {
        title: 'Compare the tens first',
        text: 'To find the greater number, look at the tens first. 52 and 48: 5 tens is more than 4 tens, so 52 is greater. If the tens are the same, like 36 and 34, compare the ones. 36 is greater.',
      },
      {
        title: 'Use 25, 50 and 75',
        text: '50 is halfway from 0 to 100. 25 is halfway to 50, and 75 is halfway from 50 to 100. Use them as helper numbers. The arrow is at 27. That is very close to 25.',
        visual: { type: 'numberline', min: 0, max: 100, ticks: 5, labels: [0, 25, 50, 75, 100], arrow: 27 },
      },
    ],
  },

  'g1-qpv-fractions': {
    intro: 'When you share fairly, every part is the same size. A whole cut into 2 equal parts makes halves. A whole cut into 4 equal parts makes fourths. Look at the bars: the same whole, cut into 1, 2 and 4 equal parts.',
    introVisual: { type: 'fractionbar', bars: [{ parts: 1, shaded: 0, label: 'whole' }, { parts: 2, shaded: 0, label: 'halves' }, { parts: 4, shaded: 0, label: 'fourths' }] },
    strategies: [
      {
        title: 'Check for equal parts',
        text: 'First, check that all the parts are the same size. Then count them. 2 equal parts means halves. 4 equal parts means fourths. If the pieces are big and small, they are not halves or fourths.',
      },
      {
        title: 'Count all, then count shaded',
        text: 'Count all the equal parts. Then count the shaded parts. This circle has 4 equal parts, and 3 are shaded. That is three fourths. If every part is shaded, that is one whole.',
        visual: { type: 'fractioncircle', parts: 4, shaded: 3, color: 'blue' },
      },
      {
        title: 'Share one at a time',
        text: 'To find half of a group, make 2 groups. Give one to each group, over and over, until none are left. Then count one group. Half of 8 cookies is 4 cookies.',
        visual: { type: 'fractionset', total: 8, shaded: 4, icon: '🍪' },
      },
      {
        title: 'A fourth is half of a half',
        text: 'Cut one half into 2 equal parts. Each part is one fourth. One half lines up with 2 fourths. So one half is bigger than one fourth, and 4 fourths make one whole.',
        visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, label: 'one half', color: 'green' }, { parts: 4, shaded: 2, label: 'two fourths', color: 'orange' }] },
      },
    ],
  },

  'g1-qpv-count': {
    intro: 'Counting tells how many. You can count on, count back, and skip count by 2s, 5s and 10s. Knowing what comes next helps you count all the way to 100.',
    strategies: [
      {
        title: 'Touch and count',
        text: 'Touch each thing once as you say a number. Slide it away so you do not count it twice. The last number you say tells how many in all.',
      },
      {
        title: 'Count on or count back',
        text: '1 or 2 more means count up. 1 or 2 less means count back. What is 2 less than 35? Start at 35 and hop back two times: 34, 33. The answer is 33.',
        visual: { type: 'numberline', min: 31, max: 37, ticks: 1, labels: 'all', jumps: [{ from: 35, to: 34, label: '−1' }, { from: 34, to: 33, label: '−1' }] },
      },
      {
        title: 'Skip count to go faster',
        text: 'Skip counting makes big jumps. By 2s: 2, 4, 6, 8. By 5s: 5, 10, 15, 20, 25. By 10s: 10, 20, 30, 40. Each jump is the same size.',
        visual: { type: 'numberline', min: 0, max: 25, ticks: 5, labels: 'all', jumps: [{ from: 0, to: 5 }, { from: 5, to: 10 }, { from: 10, to: 15 }, { from: 15, to: 20 }, { from: 20, to: 25 }] },
      },
      {
        title: 'Watch the tens change',
        text: 'After a 9 in the ones place, a new ten starts: 38, 39, 40, 41. Counting back, it goes 41, 40, 39. On a hundred chart, each new row starts a new ten.',
        visual: { type: 'hundredchart', highlight: [38, 39, 40, 41] },
      },
    ],
  },

  'g1-ops-addsub': {
    intro: 'Adding puts groups together to find how many in all. Subtracting takes some away, or finds how many more. Adding and subtracting are partners: one undoes the other.',
    strategies: [
      {
        title: 'Count on from the bigger number',
        text: 'Start with the bigger number and count on the smaller one. 3 + 8: start at 8, then say 9, 10, 11. So 3 + 8 = 11. The order does not matter: 8 + 3 is 11 too.',
        visual: { type: 'tenframe', count: 8, count2: 3 },
      },
      {
        title: 'Part, part, whole',
        text: 'Two parts make a whole. 9 and 5 make 14, so 9 + 5 = 14. If you know the whole and one part, you can find the other part: 14 − 9 = 5.',
        visual: { type: 'numberbond', whole: 14, parts: [9, 5] },
      },
      {
        title: 'Think addition to subtract',
        text: 'To solve 13 − 8, think: 8 plus what makes 13? Count up from 8: 9, 10, 11, 12, 13. That is 5 more, so 13 − 8 = 5.',
      },
      {
        title: 'Picture the story',
        text: 'Do things join? Add. Do things go away? Subtract. "How many more" means match them up and count the extras. 7 apples and 4 fish: 3 apples have no partner, so 7 − 4 = 3.',
        visual: { type: 'compare', left: { icon: '🍎', count: 7 }, right: { icon: '🐟', count: 4 } },
      },
    ],
  },

  'g1-ops-facts': {
    intro: 'Fact power means knowing small facts fast, like 4 + 6 = 10. When you know facts to 10, you can use them to solve bigger facts to 20.',
    strategies: [
      {
        title: 'Know the pairs that make 10',
        text: 'These pairs make 10: 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5. A ten frame shows it. 7 boxes are full and 3 are empty, so 7 + 3 = 10.',
        visual: { type: 'tenframe', count: 7, frames: 1 },
      },
      {
        title: 'Doubles and near doubles',
        text: 'A double is the same number twice, like two dice that both show 6: 6 + 6 = 12. Use it for a near double. For 6 + 7, think 6 + 6 = 12, then 1 more is 13.',
        visual: { type: 'dice', values: [6, 6] },
      },
      {
        title: 'Make 10 first',
        text: 'For 8 + 5, make a 10 first. 8 needs 2 more to make 10. Take 2 from the 5, and 3 are left. 10 + 3 = 13, so 8 + 5 = 13.',
        visual: { type: 'numberline', min: 7, max: 14, ticks: 1, labels: 'all', jumps: [{ from: 8, to: 10, label: '+2' }, { from: 10, to: 13, label: '+3' }] },
      },
      {
        title: 'Zero and ten facts',
        text: 'Adding 0 or taking away 0 changes nothing: 7 + 0 = 7. Taking away all of it leaves 0: 7 − 7 = 0. Ten plus a number is one ten and some ones: 10 + 4 = 14.',
      },
    ],
  },

  'g1-pat-patterns': {
    intro: 'A repeating pattern has a part that repeats over and over. That part is called the core. When you find the core, you can tell what comes next. Days of the week and seasons repeat too!',
    introVisual: {
      type: 'pattern', highlightCore: 2,
      items: [{ shape: 'circle', color: 'red' }, { shape: 'square', color: 'red' }, { shape: 'circle', color: 'red' }, { shape: 'square', color: 'red' }, { shape: 'circle', color: 'red' }, { shape: 'square', color: 'red' }, '?'],
    },
    strategies: [
      {
        title: 'Say it out loud',
        text: 'Read the pattern out loud from the start: circle, square, circle, square. Keep saying it until you reach the question mark. Your voice helps you hear what comes next. Here it is a circle.',
      },
      {
        title: 'Find the core',
        text: 'Say the pattern and listen for where it starts over from the beginning. The part before that is the core. Star, star, heart, star, star, heart: it starts over after the heart, so the core is star, star, heart.',
        visual: {
          type: 'pattern', highlightCore: 3,
          items: [{ shape: 'star', color: 'yellow' }, { shape: 'star', color: 'yellow' }, { shape: 'heart', color: 'yellow' }, { shape: 'star', color: 'yellow' }, { shape: 'star', color: 'yellow' }, { shape: 'heart', color: 'yellow' }],
        },
      },
      {
        title: 'Use letters',
        text: 'Give the first thing the letter A. The next new thing gets B, and a third new thing gets C. Dog, cat, cat, dog, cat, cat is A B B A B B. Any pattern with the same letters is the same kind.',
        visual: { type: 'pattern', items: ['🐶', '🐱', '🐱', '🐶', '🐱', '🐱'] },
      },
      {
        title: 'Check each spot',
        text: 'To find a mistake, touch each spot and say the core again and again. The spot that does not match what you say is the mistake.',
      },
    ],
  },

  'g1-pat-equal': {
    intro: 'The equal sign means "is the same as". Both sides must have the same amount, like a balance that is level. 3 + 2 = 5 is true, and 5 = 3 + 2 is true too.',
    introVisual: { type: 'balance', left: '3 + 2', right: '5', tilt: 'level' },
    strategies: [
      {
        title: 'Match them one to one',
        text: 'Line up the two groups and give each one a partner. If nothing is left over, they are equal. 5 apples and 4 fish: 1 apple has no partner, so they are not equal.',
        visual: { type: 'compare', left: { icon: '🍎', count: 5 }, right: { icon: '🐟', count: 4 } },
      },
      {
        title: 'Work out each side',
        text: 'Find the amount on each side, then compare. Is 4 + 3 = 8 true? 4 + 3 is 7, not 8. The sides are not the same, so it is false.',
        visual: { type: 'balance', left: '4 + 3', right: '8', tilt: 'right' },
      },
      {
        title: 'Make both sides match',
        text: 'For 5 + 3 = 6 + □, first add the side with no box: 5 + 3 = 8. Then think: 6 plus what makes 8? 6 + 2 = 8, so the box is 2.',
      },
    ],
  },

  'g1-meas-time': {
    intro: 'We measure time in days, weeks and months. A week has 7 days, and a month is about 4 weeks. Days and months always come in the same order. Words like yesterday, today and tomorrow, and morning, afternoon and evening, tell when things happen.',
    strategies: [
      {
        title: 'First, then, last',
        text: 'Ask: what has to happen before the others? You plant a seed first. Then you water it. Last, it grows a flower. You put on socks first, then shoes.',
        visual: { type: 'pattern', items: ['🌱', '💧', '🌻'] },
      },
      {
        title: 'Parts of the day',
        text: 'Morning is from waking up until lunch. Afternoon is after lunch until supper. Evening is from supper until bedtime. Breakfast is in the morning.',
      },
      {
        title: 'Say the days in order',
        text: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, then start again. Tomorrow is the next day. Yesterday is the day before. If today is Tuesday, tomorrow is Wednesday.',
        visual: { type: 'calendar', month: 9, year: 2026, highlight: [15, 16] },
      },
      {
        title: 'Picture how long it takes',
        text: 'Imagine doing each thing. A blink is over in a moment. A school day takes a long time. A week is 7 days, and a year is 12 months.',
      },
    ],
  },

  'g1-meas-compare': {
    intro: 'Measuring tells how long, how tall, how heavy, or how much something holds. You can compare two things, or count same-size units, like cubes, to find out how big something is.',
    strategies: [
      {
        title: 'Line up the ends',
        text: 'To compare length, line up one end of each thing. Then look at the other end. The one that reaches farther is longer. For height, stand them on the same line and look at the tops.',
        visual: { type: 'measurecompare', attribute: 'length', items: [{ object: '🥕', value: 7 }, { object: '✏️', value: 4 }] },
      },
      {
        title: 'Heavier, and holds more',
        text: 'On a balance, the heavier thing pulls its side down. A watermelon is heavier than a feather. To find which holds more, imagine filling each one with cups of water. A bucket holds more than a glass.',
        visual: { type: 'balance', left: '🍉', right: '🪶', tilt: 'left' },
      },
      {
        title: 'Count units with no gaps',
        text: 'Lay same-size units end to end, with no gaps and no overlaps. Then count them. This one is 6 squares long. A decimetre is as long as a ten-rod.',
        visual: { type: 'grid', cols: 8, rows: 1, rect: { x: 0, y: 0, w: 6, h: 1 }, showUnits: true },
      },
      {
        title: 'Small units, bigger count',
        text: 'It takes more small units than big units to cover the same thing. If a big block is as long as 2 small blocks, a rug that is 4 big blocks long is 8 small blocks long.',
      },
    ],
  },

  'g1-geo-shapes': {
    intro: 'Flat shapes, like triangles and squares, are 2-D. Solid shapes, like cubes and balls, are 3-D. A shape keeps its name when it is big, small, skinny or turned. All of these are triangles!',
    introVisual: { type: 'shapes', items: [{ shape: 'triangle', color: 'blue' }, { shape: 'right_triangle', color: 'green', rotate: 90 }, { shape: 'scalene_triangle', color: 'orange', rotate: 30, size: 's' }] },
    strategies: [
      {
        title: 'Count sides and corners',
        text: 'Put your finger on one side and go all the way around. A triangle has 3 sides and 3 corners. A square and a rectangle have 4 sides and 4 corners. A circle has none.',
        visual: { type: 'shapes', items: [{ shape: 'triangle', color: 'blue', label: '3 sides' }, { shape: 'square', color: 'red', label: '4 sides' }, { shape: 'rectangle', color: 'green', label: '4 sides' }, { shape: 'circle', color: 'purple', label: '0 sides' }] },
      },
      {
        title: 'Sort by one rule',
        text: 'To sort, check one thing at a time: shape, colour or size. Three shapes follow the rule. The odd one out is the one that breaks it.',
      },
      {
        title: 'Match solids to real things',
        text: 'A ball is a sphere. A can is a cylinder. A dice is a cube. An ice cream cone is a cone. A face is a flat side: a cube has 6 faces. Solids with a curved part can roll.',
        visual: { type: 'solids', items: [{ solid: 'sphere', color: 'red', label: 'sphere' }, { solid: 'cylinder', color: 'blue', label: 'cylinder' }, { solid: 'cube', color: 'green', label: 'cube' }, { solid: 'cone', color: 'orange', label: 'cone' }] },
      },
      {
        title: 'Put shapes together',
        text: 'Slide shapes together with no gaps to make a new shape. Two squares side by side make a rectangle. Two half circles make a circle. Six triangles can make a hexagon.',
      },
    ],
  },

  'g1-data-data': {
    intro: 'A graph shows what people picked, so we can compare. The title tells what it is about. In this graph, each face is one child. To learn about your class, ask everyone and keep track of the answers.',
    introVisual: { type: 'pictograph', title: 'Favourite Pet', rows: [{ label: '🐶 Dog', count: 5 }, { label: '🐱 Cat', count: 3 }, { label: '🐟 Fish', count: 2 }], icon: '🙂', key: 1 },
    strategies: [
      {
        title: 'Count each row',
        text: 'Find the row you need. Touch each picture and count. In the pet graph, Dog has 5, Cat has 3 and Fish has 2.',
      },
      {
        title: 'Most, least, how many more',
        text: 'Most is the longest bar or row. Least is the shortest. For how many more, count up from the smaller number: Cat 3 to Dog 5 is 4, 5. That is 2 more.',
        visual: { type: 'bargraph', title: 'Favourite Pet', labels: ['🐶 Dog', '🐱 Cat', '🐟 Fish'], values: [5, 3, 2], scale: 1 },
      },
      {
        title: 'Add for the total',
        text: 'To find how many in all, add every row. 5 + 3 + 2 = 10, so 10 children picked a pet.',
      },
      {
        title: 'Make a cube graph',
        text: 'Ask a question with a few choices. Each child adds one cube to the row for their answer. Start every row at the same line. One cube means one child, so the longest row is the favourite.',
        visual: { type: 'pictograph', title: 'Favourite Season', rows: [{ label: '☀️ Summer', count: 4 }, { label: '❄️ Winter', count: 2 }, { label: '🍂 Fall', count: 3 }], icon: '🟦', key: 1 },
      },
    ],
  },

  'g1-data-money': {
    intro: 'Canada has coins with different values. A nickel is 5¢, a dime is 10¢, a quarter is 25¢, a loonie is $1 and a toonie is $2. Knowing coins helps you pay for things.',
    introVisual: { type: 'coins', items: ['nickel', 'dime', 'quarter', 'loonie', 'toonie'] },
    strategies: [
      {
        title: 'Know each coin',
        text: 'The nickel has a beaver. The dime is the smallest coin. The quarter has a caribou. The loonie is gold. The toonie has two colours.',
      },
      {
        title: 'Size is not value',
        text: 'A dime is smaller than a nickel, but a dime is worth more! A nickel is 5¢ and a dime is 10¢. Always name the coin first, then think of what it is worth.',
        visual: { type: 'coins', items: ['nickel', 'dime'] },
      },
      {
        title: 'Skip count the coins',
        text: 'Count nickels by 5s and dimes by 10s. Count loonies by 1s and toonies by 2s. Four nickels: 5, 10, 15, 20. That is 20¢.',
        visual: { type: 'coins', items: ['nickel', 'nickel', 'nickel', 'nickel'] },
      },
      {
        title: 'Pay exactly',
        text: 'Add up the coins and compare with the price. 2 nickels make 10¢, the same as a dime. You have enough money when you have the price or more.',
      },
    ],
  },
};

// Teaching Moment lessons for Grade 6 skills (see src/ui/lesson.js). Keyed by skill id.
// { intro, introVisual?, strategies: [{ title, text, visual? }] }  — visuals use the renderVisual spec (docs/VISUALS_SPEC.md).
export const LESSONS_G6 = {
  'g6-num-numbers': {
    intro: 'This skill is about how numbers are built. Place value tells you what each digit is worth, even in the millions and billions. Factors and multiples help you sort numbers into prime and composite, and you can also write fractions as decimals.',
    introVisual: { type: 'placevalue', columns: ['Millions', 'Hundred Thousands', 'Ten Thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'], digits: [4, 1, 2, 5, 0, 0, 0] },
    strategies: [
      { title: 'Read big numbers in groups of 3', text: 'Split the digits into groups of three from the right: millions, thousands, then ones. 4 125 000 is "four million one hundred twenty-five thousand". Each place is worth 10 times the place to its right.' },
      { title: 'Use factor pairs', text: 'List factor pairs in order: 12 = 1 × 12, 2 × 6, 3 × 4. So 12 has six factors: 1, 2, 3, 4, 6, 12. More than two factors means composite. A prime, like 7, has only 1 and itself. 0 and 1 are neither.',
        visual: { type: 'array', rows: 3, cols: 4 } },
      { title: 'Compare lists for GCF and LCM', text: 'Greatest common factor: the biggest number in both factor lists. 12 and 18 share 1, 2, 3 and 6, so the GCF is 6. Least common multiple: count up by each number. 4, 8, 12, 16, 20 and 10, 20: the LCM of 4 and 10 is 20.',
        visual: { type: 'table', headers: ['Number', 'Factors'], rows: [['12', '1, 2, 3, 4, 6, 12'], ['18', '1, 2, 3, 6, 9, 18']] } },
      { title: 'Change fractions to decimals', text: 'Divide the top by the bottom, or make an equal fraction out of 10, 100 or 1000: [[f:3/4]] = [[f:75/100]] = 0.75. Some decimals never end: [[f:1/3]] = 0.333…, and the "…" means the 3s repeat forever.' },
    ],
  },

  'g6-num-percent': {
    intro: 'Percent means "out of 100", so 35% is 35 out of 100. A ratio compares amounts, like 3 cats to 5 dogs (3:5). A rate compares two different units, like 72 km per hour. You use these for sales, recipes and finding the better buy.',
    introVisual: { type: 'hundredgrid', shaded: 35 },
    strategies: [
      { title: 'Start from benchmark percents', text: '50% = [[f:1/2]], 25% = [[f:1/4]], 10% = [[f:1/10]] and 1% = [[f:1/100]]. 10% of 170 is 170 ÷ 10 = 17. Build other percents from these: 5% is half of 10%, 15% = 10% + 5%, and 40% is 4 × 10%.',
        visual: { type: 'barmodel', whole: 170, parts: [17, 153], labels: ['10%', '90%'] } },
      { title: 'Make it out of 100', text: 'To change a fraction to a percent, make the bottom 100. For [[f:13/25]]: 25 × 4 = 100, so 13 × 4 = 52, and [[f:13/25]] = [[f:52/100]] = 52% = 0.52. A ratio of 4:1 means 4 out of every 5, and [[f:4/5]] = 80%.' },
      { title: 'Use a ratio table', text: 'Equal ratios grow by the same multiplier. 3 scoops of berries for 9 scoops of yogurt: 3 × 4 = 12, so 9 × 4 = 36. For part-to-whole, add the parts: gold to silver 3:4 means 3 of every 7 coins are gold.',
        visual: { type: 'table', headers: ['Berries', 'Yogurt'], rows: [[3, 9], [6, 18], [9, 27], [12, 36]] } },
      { title: 'Find the unit rate', text: 'Find the amount for 1 first, then multiply. 360 km in 5 hours is 360 ÷ 5 = 72 km per hour, so 3 hours is 72 × 3 = 216 km. For the better buy, compare the cost of one: the lower unit price wins.' },
    ],
  },

  'g6-ops-decimals': {
    intro: 'Decimals show parts of a whole, like money ($4.75) and measurements (2.5 km). You add, subtract, multiply and divide them much like whole numbers. The big job is putting the decimal point in the right place.',
    strategies: [
      { title: 'Line up the decimal points', text: 'To add or subtract, stack the numbers so the decimal points line up, and fill empty places with zeros (5 = 5.00). Then work from the right like whole numbers. 6.2 − 4.6 = 1.6, because 4.6 + 1.6 = 6.2.',
        visual: { type: 'barmodel', whole: 6.2, parts: [4.6, 1.6] } },
      { title: 'Estimate first', text: 'Round to whole numbers to get a close answer. 4.51 × 8 is about 5 × 8 = 40, so 36.08 makes sense, but 3.608 or 360.8 do not. Your estimate tells you where the decimal point goes.' },
      { title: 'Think in hundredths', text: '6.86 is 686 hundredths. 686 × 6 = 4116, so 6.86 × 6 = 4116 hundredths = 41.16. Dividing works the same way: 46.16 ÷ 8 = 4616 hundredths ÷ 8 = 577 hundredths = 5.77. Check: 5.77 × 8 = 46.16.' },
      { title: 'Use benchmark decimals', text: '0.5 is one half, 0.25 is one fourth, 0.1 is one tenth and 0.01 is one hundredth. So 0.5 × 8 is half of 8, which is 4. And 0.6 × 4 means 4 jumps of 0.6 on a number line: 0.6, 1.2, 1.8, 2.4.',
        visual: { type: 'numberline', min: 0, max: 3, ticks: 0.2, labels: [0, 0.6, 1.2, 1.8, 2.4, 3], labelFormat: 'decimal', jumps: [{ from: 0, to: 0.6, label: '+0.6' }, { from: 0.6, to: 1.2, label: '+0.6' }, { from: 1.2, to: 1.8, label: '+0.6' }, { from: 1.8, to: 2.4, label: '+0.6' }] } },
    ],
  },

  'g6-ops-fractions': {
    intro: 'Fraction operations let you combine and share parts of a whole, like [[f:1 3/4]] km of trail or [[f:2/3]] of a pizza. You simplify fractions, rename them with a common denominator, and add, subtract, multiply and divide them, including mixed numbers.',
    strategies: [
      { title: 'Find a common denominator', text: 'Only same-size parts can be added or subtracted. For halves and thirds, use sixths: [[f:1/2]] + [[f:1/3]] = [[f:3/6]] + [[f:2/6]] = [[f:5/6]]. Then simplify by dividing the top and bottom by the same number, like [[f:6/10]] = [[f:3/5]].',
        visual: { type: 'fractionbar', bars: [{ parts: 2, shaded: 1, label: '[[f:1/2]]', color: 'blue' }, { parts: 6, shaded: 3, label: '[[f:3/6]]', color: 'blue' }, { parts: 3, shaded: 1, label: '[[f:1/3]]', color: 'orange' }, { parts: 6, shaded: 2, label: '[[f:2/6]]', color: 'orange' }] } },
      { title: 'Trade a whole when subtracting', text: '[[f:4 1/2]] − [[f:7/8]]: rename to [[f:4 4/8]] − [[f:7/8]]. You cannot take 7 eighths from 4 eighths, so trade 1 whole for [[f:8/8]]: [[f:3 12/8]] − [[f:7/8]] = [[f:3 5/8]]. Estimate to check: about [[f:4 1/2]] − 1 = [[f:3 1/2]].' },
      { title: 'Multiply tops, multiply bottoms', text: 'For a fraction of a fraction, multiply the tops and the bottoms: [[f:4/5]] × [[f:4/5]] = [[f:16/25]]. Taking part of something makes it smaller. For a whole number times a mixed number, split it: 4 × [[f:2 3/4]] = 8 + 3 = 11.' },
      { title: 'Divide: how many fit?', text: '2 ÷ [[f:1/4]] asks how many fourths fit into 2. Each whole holds 4 fourths, so 2 wholes hold 8. Sharing is different: [[f:1/3]] ÷ 2 splits one third into 2 equal parts, and each part is [[f:1/6]].',
        visual: { type: 'fractionbar', bars: [{ parts: 4, shaded: 4, label: 'Whole 1', color: 'green' }, { parts: 4, shaded: 4, label: 'Whole 2', color: 'green' }] } },
    ],
  },

  'g6-ops-order': {
    intro: 'When an expression has more than one operation, the order you do them in changes the answer. The order of operations is a rule everyone follows, so everyone gets the same answer. For example, 10 + 6 × 3 is 28, not 48.',
    introVisual: { type: 'expression', text: '10 + 6 × 3 = 10 + 18 = 28' },
    strategies: [
      { title: 'Follow the three steps', text: 'First, do anything in brackets. Next, do × and ÷ from left to right. Last, do + and − from left to right. There are no exponents here, so these three steps are all you need.',
        visual: { type: 'table', headers: ['Step', 'Do this'], rows: [['1', 'Brackets ( )'], ['2', '× and ÷, left to right'], ['3', '+ and −, left to right']] } },
      { title: 'One step at a time', text: 'Do one step, then rewrite the whole expression: (5 + 9) × 3 − 4 → 14 × 3 − 4 → 42 − 4 → 38. Rewriting after each step stops you from skipping or mixing up steps.' },
      { title: 'Left to right for partners', text: '× and ÷ are partners: do whichever comes first as you read from the left. + and − are partners too. In 10 − 10 ÷ 2 + 1, divide first to get 10 − 5 + 1, then go left to right: 5 + 1 = 6.' },
      { title: 'Brackets change the answer', text: '4 + 5 × 3 = 19, but (4 + 5) × 3 = 27. Use brackets when a story needs a part done first: tickets cost $5 each for 3 adults and 4 kids, so the total is 5 × (3 + 4) = 35 dollars.' },
    ],
  },

  'g6-data-data': {
    intro: 'Data are facts you collect to answer a question. Good data needs fair questions and a good way to collect it. Then you show it on the right kind of graph, read the graph carefully, and watch out for graphs that trick your eyes.',
    strategies: [
      { title: 'Read the scale first', text: 'Before reading a bar, check what each grid line is worth. In this graph each line is 10, so Unicorns is 70 and Krakens is 90: 20 more. On a pictograph, use the key: if 1 picture = 10, half a picture = 5.',
        visual: { type: 'bargraph', title: 'Creature sightings', labels: ['Dragons', 'Unicorns', 'Phoenixes', 'Krakens'], values: [30, 70, 60, 90], scale: 10 } },
      { title: 'Pick the right graph', text: 'A bar graph compares separate groups. A double bar graph compares two sets side by side, like Grade 5 and Grade 6. A line graph shows change over time, like the temperature every hour. A pictograph uses pictures and a key.',
        visual: { type: 'bargraph', title: 'Favourite fruit', labels: ['Apple', 'Banana', 'Mango'], values: [8, 5, 6], series1Name: 'Grade 5', series2: { name: 'Grade 6', values: [6, 7, 9] }, scale: 2 } },
      { title: 'Ask fair questions', text: 'A fair question does not push people to one answer: ask "What is your favourite game?", not "Tag is the best game, right?" Ask enough people, from the whole group. Use a database for past facts, like last year’s rainfall.' },
      { title: 'Spot misleading graphs', text: 'Check for a title and labels, a scale that starts at 0, and equal spaces. Scores of 91 and 96 graphed on a scale starting at 89 make one bar look over 3 times as tall, but the real difference is only 5 points.' },
    ],
  },

  'g6-data-tables': {
    intro: 'A table of values lists pairs of numbers that follow a rule, like y = x + 3 or y = 2x. Each input x gives an output y. You can plot each pair (x, y) as a point on a graph, and the points make a pattern.',
    strategies: [
      { title: 'Substitute x into the rule', text: 'Replace x with its number and work it out. For y = x + 7 and x = 5: y = 5 + 7 = 12. Remember that 7x means 7 × x. To go backward, undo the rule: if y = 5x and y = 110, then x = 110 ÷ 5 = 22.' },
      { title: 'Look at how y changes', text: 'Watch what happens to y each time x goes up by 1. If y also goes up by 1, the rule adds or subtracts, like y = x + 4. In this table y goes up by 3 each time and starts at 0, so the rule is y = 3x.',
        visual: { type: 'table', headers: ['x', 'y'], rows: [[0, 0], [1, 3], [2, 6], [3, 9], [4, 12]] } },
      { title: 'Test every row', text: 'An equation must work for every pair in the table. The pair (2, 12) fits both y = 6x and y = x + 10. Try the next pair, (3, 18): 6 × 3 = 18 works, but 3 + 10 = 13 does not. So the rule is y = 6x.' },
      { title: 'Plot the pairs as points', text: 'Each pair (x, y) is a point: go x across, then y up. The points for y = 2x are (0, 0), (1, 2), (2, 4), (3, 6) and (4, 8), and they line up in a straight line. Line graphs also suit data that changes over time.',
        visual: { type: 'coordplane', max: 8, points: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }, { x: 4, y: 8 }] } },
    ],
  },

  'g6-data-coords': {
    intro: 'A coordinate grid has two number lines: the x-axis goes across and the y-axis goes up. They meet at the origin, (0, 0). An ordered pair like (3, 5) tells you exactly where a point is. You can also slide, flip and turn shapes on the grid.',
    strategies: [
      { title: 'Across first, then up', text: 'In (x, y), start at the origin. Move x across, then y up: A (3, 5) is 3 across and 5 up. A 0 means no move in that direction, so B (4, 0) is on the x-axis and C (0, 2) is on the y-axis.',
        visual: { type: 'coordplane', max: 6, points: [{ x: 3, y: 5, label: 'A' }, { x: 4, y: 0, label: 'B' }, { x: 0, y: 2, label: 'C' }] } },
      { title: 'Translate: change the numbers', text: 'Moving right adds to x, and left subtracts. Moving up adds to y, and down subtracts. In the picture every vertex slides 4 right and 3 up, so (1, 1) becomes (5, 4). Match one vertex with its image and count.',
        visual: { type: 'transform', grid: 8, original: [[1, 1], [4, 1], [1, 3]], image: [[5, 4], [8, 4], [5, 6]] } },
      { title: 'Reflect: same distance from line', text: 'Each image point is the same distance from the mirror line, on the other side. Here the line is the vertical line through 5. (4, 1) is 1 unit left of it, so its image is (6, 1). (2, 1) is 3 units left, so its image is (8, 1).',
        visual: { type: 'transform', grid: 10, original: [[2, 1], [4, 1], [4, 4]], image: [[8, 1], [6, 1], [6, 4]], mirror: { axis: 'y', at: 5 } } },
      { title: 'Rotate: size, direction, centre', text: 'Describe a turn by its size (¼, ½ or ¾ turn), its direction (clockwise or counterclockwise) and its centre. Follow a side that touches the centre P: in the solid shape it points right, in the dashed shape it points up. That is a ¼ turn counterclockwise.',
        visual: { type: 'coordplane', max: 8, polygon: [[4, 4], [7, 4], [7, 5], [4, 5]], polygon2: [[4, 4], [4, 7], [3, 7], [3, 4]], points: [{ x: 4, y: 4, label: 'P' }] } },
    ],
  },

  'g6-chance-prob': {
    intro: 'Probability tells how likely something is, from 0 (impossible) to 1 (certain). Theoretical probability is what should happen, found from the possible outcomes. Experimental probability is what did happen when you did trials. You can write a probability as a fraction, decimal, percent or ratio.',
    strategies: [
      { title: 'Favourable ÷ all outcomes', text: 'Count the outcomes you want, then all the possible outcomes. This jar has 4 red marbles out of 12, so the probability of red is [[f:4/12]] = [[f:1/3]]. For NOT red, count the rest: [[f:8/12]] = [[f:2/3]].',
        visual: { type: 'marbles', items: [{ color: 'red', count: 4 }, { color: 'blue', count: 5 }, { color: 'yellow', count: 3 }] } },
      { title: 'List the sample space', text: 'Use a table or tree diagram so you do not miss an outcome. A coin and a number cube give 2 × 6 = 12 outcomes. Two coins give HH, HT, TH and TT, so the probability of at least one head is [[f:3/4]].',
        visual: { type: 'table', title: 'Two coins', headers: ['', 'H', 'T'], rows: [['H', 'HH', 'HT'], ['T', 'TH', 'TT']] } },
      { title: 'Predict with the fraction', text: 'Use theoretical probability to predict. A spinner with 2 of its 4 equal sections green has a [[f:2/4]] chance of green. In 16 spins, expect about [[f:2/4]] of 16 = 8 greens. Real results may be a little different.' },
      { title: 'Experimental: count results', text: 'Experimental probability = times it happened ÷ number of trials. In these 30 rolls, 4 came up 6 times: [[f:6/30]] = [[f:1/5]]. Theory says [[f:1/6]]. More trials usually bring the results closer to theory.',
        visual: { type: 'tally', title: '30 rolls', rows: [{ label: '1', count: 5 }, { label: '2', count: 4 }, { label: '3', count: 5 }, { label: '4', count: 6 }, { label: '5', count: 4 }, { label: '6', count: 6 }] } },
    ],
  },

  'g6-alg-equations': {
    intro: 'An equation says two sides are equal, like a balance that is level. A letter such as n stands for an unknown number (a variable). To solve the equation, find the value that makes both sides equal. Whatever you do to one side, you must do to the other.',
    strategies: [
      { title: 'Keep the balance level', text: 'Do the same thing to both sides. For p − 4 = 10, add 4 to both sides: p − 4 + 4 = 10 + 4, so p = 14. The balance stays level because both sides changed in the same way.',
        visual: { type: 'balance', left: 'p − 4', right: '10', tilt: 'level' } },
      { title: 'Undo with inverse operations', text: 'Adding and subtracting undo each other, and so do multiplying and dividing. For 6c + 6 = 72, subtract 6 from both sides (6c = 66), then divide both sides by 6 (c = 11). Check: 6 × 11 + 6 = 72.',
        visual: { type: 'barmodel', whole: 72, parts: ['6c', 6] } },
      { title: 'Write an equation from a story', text: 'Pick a letter for the unknown and follow the story. "Isla has some cards, gets 7 more, and now has 20" is c + 7 = 20. "Tickets cost $4 each and Noor spends $80" is 4t = 80. Equal groups mean ×, sharing means ÷.' },
      { title: 'Switch the order with + and ×', text: 'The commutative property says you can switch the order in a sum or a product: 4 × p = p × 4, and 9 + m = m + 9. It does not work for − or ÷: 8 − 2 = 6, but 2 − 8 is less than 0. Test a number to check.' },
    ],
  },

  'g6-meas-pav': {
    intro: 'Perimeter is the distance around a shape. Area is the space a flat shape covers, in square units like cm². Volume is the space inside a 3-D object, in cubic units like cm³. The area rules for rectangles, parallelograms and triangles are all connected.',
    strategies: [
      { title: 'Perimeter: add every side', text: 'Add the lengths of all the sides: 4 + 6 + 3 + 2 = 15 cm. If all the sides are equal, multiply: a regular hexagon with 5 cm sides has a perimeter of 6 × 5 = 30 cm. For a rectangle, use 2 × (length + width).' },
      { title: 'Parallelogram: base × height', text: 'Cut the triangle off one end of a parallelogram and slide it to the other end: it becomes a rectangle. So area = base × height. Use the straight-up height, not the slanted side. Here the base is 4 and the height is 5: 20 square units.',
        visual: { type: 'coordplane', max: 8, polygon: [[1, 1], [5, 1], [7, 6], [3, 6]] } },
      { title: 'A triangle is half a rectangle', text: 'A triangle is half of a rectangle with the same base and height, so area = base × height ÷ 2. The striped triangle has base 6 and height 4: 6 × 4 ÷ 2 = 12 square units, half of the 24-unit rectangle.',
        visual: { type: 'coordplane', max: 8, polygon: [[1, 1], [7, 1], [7, 5], [1, 5]], polygon2: [[1, 1], [7, 1], [3, 5]] } },
      { title: 'Volume: base area × height', text: 'Find the area of the base, then multiply by the height. This prism has a 4 × 3 base, so 12 cubes fit in each layer, and 2 layers make 12 × 2 = 24 cubic units. Turning a box on its side does not change its volume.',
        visual: { type: 'prism', l: 4, w: 3, h: 2, showCubes: true } },
    ],
  },

  'g6-meas-angles': {
    intro: 'An angle measures an amount of turn, in degrees (°). A square corner is 90°, a straight line is 180°, and a full turn is 360°. You can sort angles by size, measure them with a protractor, and use angle sums to find missing angles.',
    strategies: [
      { title: 'Compare with benchmark angles', text: 'Acute is less than 90°, right is exactly 90°, obtuse is between 90° and 180°, straight is 180°, and reflex is more than 180°. Use 45°, 90° and 180° to estimate: this 135° angle is halfway between 90° and 180°.',
        visual: { type: 'angle', degrees: 135, showArc: true, label: '135°' } },
      { title: 'Read the right protractor scale', text: 'Put the centre on the vertex and one arm on 0, then read up from that 0. Real protractors have two scales, so check your answer: this angle is obtuse (wider than a square corner), so it is 120°, not 60°.',
        visual: { type: 'protractor', degrees: 120 } },
      { title: 'Use the angle sums', text: 'A triangle’s angles add to 180°, and a quadrilateral’s add to 360°. Add the angles you know and subtract: a triangle with 41° and 57° has 180 − 98 = 82° left. Angles on a straight line add to 180°, and around a point to 360°.' },
      { title: 'Turns and clocks', text: 'A ¼ turn is 90°, a ½ turn is 180°, a ¾ turn is 270° and a full turn is 360°. A clock’s 12 hour marks are 30° apart (360 ÷ 12). At 9:00 the hands are 3 marks apart: 3 × 30° = 90°, a right angle.',
        visual: { type: 'clock', hour: 9, minute: 0 } },
    ],
  },

  'g6-geo-solids': {
    intro: '3-D objects have faces (flat surfaces), edges (where two faces meet) and vertices (corners where edges meet). Prisms and pyramids are named after the shape of their base. Knowing their parts helps you sort them and match them to their nets.',
    strategies: [
      { title: 'Prism or pyramid?', text: 'A prism has two matching bases joined by rectangles. A pyramid has one base, with triangles that meet at a point. The base names the solid: a triangle base makes a triangular prism or a triangular pyramid.',
        visual: { type: 'solids', items: [{ solid: 'tri_prism', color: 'blue', label: 'prism' }, { solid: 'square_pyramid', color: 'orange', label: 'pyramid' }] } },
      { title: 'Count from the base', text: 'If the base has n sides, a prism has n + 2 faces, 3 × n edges and 2 × n vertices. A pyramid has n + 1 faces, 2 × n edges and n + 1 vertices. So a pentagonal prism has 7 faces, 15 edges and 10 vertices.',
        visual: { type: 'table', headers: ['', 'Faces', 'Edges', 'Vertices'], rows: [['Prism', 'n + 2', '3 × n', '2 × n'], ['Pyramid', 'n + 1', '2 × n', 'n + 1']] } },
      { title: 'Parallel and perpendicular', text: 'Parallel faces or edges point the same way and never meet, like a floor and a ceiling. Perpendicular ones meet at a right angle. A box on a table has 8 horizontal edges (4 on top, 4 on the bottom) and 4 vertical edges.' },
      { title: 'Match the net to the faces', text: 'A net is a solid unfolded flat. Count its face shapes: 2 triangles and 3 rectangles fold into a triangular prism. 1 square and 4 triangles make a square-based pyramid. 4 triangles make a triangular pyramid.',
        visual: { type: 'shapes', items: [{ shape: 'triangle', color: 'blue' }, { shape: 'triangle', color: 'blue' }, { shape: 'rectangle', color: 'orange' }, { shape: 'rectangle', color: 'orange' }, { shape: 'rectangle', color: 'orange' }] } },
    ],
  },

  'g6-classic-integers': {
    intro: 'Integers are the whole numbers and their opposites: … −3, −2, −1, 0, 1, 2, 3 … Negative integers are less than 0. You see them in temperatures below zero, depths below sea level and money spent.',
    introVisual: { type: 'numberline', min: -5, max: 5, ticks: 1, labels: 'all', marks: [{ value: -3, label: '−3', color: 'blue' }, { value: 3, label: '3', color: 'orange' }] },
    strategies: [
      { title: 'Farther right is greater', text: 'On a number line, numbers get bigger as you move right. So 2 > −8, and −3 > −7 because −3 is closer to 0. Every positive number is greater than every negative number, and the most negative number is the least.' },
      { title: 'Opposites match across 0', text: 'Opposites are the same distance from 0, on different sides, like −3 and 3 in the picture above. The opposite of −20 is 20, and the opposite of 8 is −8.' },
      { title: 'Listen for clue words', text: 'Above, gained, earned and rose mean a positive integer. Below, lost, spent and dropped mean a negative integer. A diver 5 m below sea level is at −5 m, and spending $16 is −16.' },
      { title: 'Count through zero', text: 'To find how far apart −6 and 5 are, count from −6 up to 0 (6 steps), then from 0 up to 5 (5 steps): 6 + 5 = 11. For a temperature change, count right to rise or left to drop: −10 rising 11 degrees gives 1.',
        visual: { type: 'numberline', min: -7, max: 6, ticks: 1, labels: 'all', jumps: [{ from: -6, to: 0, label: '6 steps' }, { from: 0, to: 5, label: '5 steps' }] } },
    ],
  },
};

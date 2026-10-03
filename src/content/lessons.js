// All Teaching Moment lessons, keyed by skill id.
import { LESSONS_G1 } from './lessons/grade1.js';
import { LESSONS_G2 } from './lessons/grade2.js';
import { LESSONS_G3 } from './lessons/grade3.js';
import { LESSONS_G4 } from './lessons/grade4.js';
import { LESSONS_G5 } from './lessons/grade5.js';
import { LESSONS_G6 } from './lessons/grade6.js';

export const LESSONS = { ...LESSONS_G1, ...LESSONS_G2, ...LESSONS_G3, ...LESSONS_G4, ...LESSONS_G5, ...LESSONS_G6 };

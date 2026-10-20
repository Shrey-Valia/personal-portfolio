// DUBLIN HIGH · High school diploma, Aug 2021 – Jun 2025.
// Beats: the front marquee and diploma sign → four years, one pennant per
// grade (9th: the front walk, 10th: locker banks you climb, 11th: across
// the classroom roofs) → 12th grade: a port plugged into a giant laptop
// takes you into the EduLearn Hackathon's video call (it was online):
// 700 webcam tiles and a 2-1-3 results podium; climbing to 1st takes the
// trophy → commencement, where tossed caps settle into steps up to the
// stage, too high to jump to without them → GRADUATE.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/dhs.js';

const FRONT = [
  '',
  '',
  '',
  '',
  '',
  '.............1',
  '........................c.c.c',
  '....................K',
  '.......................=======',
  '',
  '.2.@..N......S..................',
  '################################',
  '################################',
  '################################',
];

const LOCKERS = [
  '',
  '',
  '',
  '',
  '',
  '..................c.c',
  '...........~',
  '.................[[[..........##',
  '..............[[[.............##',
  '.....[[[..................[[[[##',
  '.3....................e.......##',
  '################################',
  '################################',
  '################################',
];

const ROOFTOPS = [
  '',
  '',
  '',
  '',
  '.............c.c.c',
  '..................e',
  '..4...C....#########',
  '#########..#########..########',
  '#########..#########..########',
  '#########..#########..########',
  '#########..#########..########',
  '#########..#########..##########',
  '#########..#########..##########',
  '#########..#########..##########',
];

const LAPTOP = [
  '.......................#########',
  '......................6#########',
  '.......................#########',
  '.......................#########',
  '.......................#########',
  '.......................#########',
  '..........~............#########',
  '........c.c.c..........#########',
  '.......................#########',
  '...................P...#########',
  '..5....................#########',
  '################################',
  '################################',
  '################################',
];

const COMMENCEMENT = [
  '............7',
  '....................8',
  '',
  '',
  '',
  '.............................G',
  '....................############',
  '....................############',
  '....................############',
  '.P..................############',
  '....................############',
  '################################',
  '################################',
  '################################',
];

const CALL = [
  '##############################',
  '#1...........................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#.........2..................#',
  '#............###.............#',
  '#............###.............#',
  '#.P.......######.........P...#',
  '#.........#########..........#',
  '##############################',
  '##############################',
  '##############################',
];

export default {
  id: 'dhs',
  node: 'dhs',
  title: 'Dublin High',
  sub: 'High school diploma · Aug 2021–Jun 2025',
  theme: 'dhs',
  kit: 'dhs',
  skin: 'dhs',
  music: 'dhs',
  goal: 'Graduate',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([FRONT, LOCKERS, ROOFTOPS, LAPTOP, COMMENCEMENT]),
      band: 'red.2',
      facts: { S: ['e-dhs'] },
      duck: ['Walk into signs to read them. Stomp bugs and pop quizzes.'],
      ports: [{ to: 'call', exit: 0 }, { to: 'call', exit: 1 }],
      marks: {
        1: { type: 'dhs.marquee', title: 'Dublin High School', lines: ['Welcome, class of 2025'] },
        2: { type: 'dhs.pennant', big: '9th' },
        3: { type: 'dhs.pennant', big: '10th' },
        4: { type: 'dhs.pennant', big: '11th' },
        5: { type: 'dhs.pennant', big: '12th' },
        '[': { type: 'dhs.lockers' },
        '~': { type: 'dhs.plane', range: 3 },
        6: { type: 'dhs.laptop', w: 9, title: 'EduLearn Hackathon', port: -3 },
        7: { type: 'dhs.caps', w: 28, caps: [[-6, 160], [28, 144], [62, 128], [96, 112]] },
        8: { type: 'dhs.stage', w: 12, text: 'Class of 2025' },
      },
    },
    call: {
      kit: 'dhs.online',
      theme: 'dhs.online',
      camera: 'fixed',
      safe: true,
      band: 'teal.2',
      map: CALL,
      facts: { trophy: ['a-edulearn'] },
      ports: [{ to: 'main', exit: 0 }, { to: 'main', exit: 1 }],
      marks: {
        1: { type: 'dhs.gallery', n: 700, area: [18, 42, 462, 134], window: [192, 40, 288, 80] },
        2: { type: 'dhs.podium', steps: [{ dx: 0, w: 3, n: 2 }, { dx: 3, w: 3, n: 1 }, { dx: 6, w: 3, n: 3 }] },
      },
    },
  },
};

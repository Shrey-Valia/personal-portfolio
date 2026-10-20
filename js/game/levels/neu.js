// NORTHEASTERN · B.S. Computer Science + Computer Engineering, Boston,
// expected May 2029. Beats: the campus gate and degree sign on a snowy
// street → road-work digs → the streetcar: ride its roof up to the campus
// level → brick rooftops → a port into the LECTURE HALL, where one
// textbook per course (from the résumé's data-credit list) steps up to
// the exit and a chalkboard tallies the credits → the quad → CLASS OF 2029.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/neu.js';

const HUNTINGTON = [
  '9',
  '',
  '',
  '',
  '',
  '............1',
  '........................c.c.c',
  '...................K',
  '',
  '..........................##',
  '..@..........S.......##.e.##',
  '##############################',
  '##############################',
  '##############################',
];

const ROADWORK = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '......cc.........cc',
  '',
  '.....4..4.......4..4....&',
  '######..#########..###########',
  '######..#########..###########',
  '######..#########..###########',
];

const STREETCAR = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '.........2',
  '....3',
  '....C.N',
  '....#####',
  '##########################',
  '##########################',
  '##########################',
];

const CAMPUS = [
  '..............................######',
  '.............................5######',
  '..............................######',
  '...c.c.c......................######',
  '..............c.c.............######',
  '##########....................######',
  '##########..########..........######',
  '##########..########...c.c....######',
  '##########..########..........######',
  '##########..###########....P..######',
  '##########..###########.......######',
  '##########..########################',
  '##########..########################',
  '##########..########################',
];

const QUAD = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '...........c.c.c',
  '',
  '.P',
  '..........&....##..e..##...G',
  '##############################',
  '##############################',
  '##############################',
];

const HALL = [
  '##############################',
  '#1...........................#',
  '#.2..........................#',
  '#............................#',
  '#........................P...#',
  '#............................#',
  '#.......................######',
  '#.......................######',
  '#.......................######',
  '#.P.....................######',
  '#.......................######',
  '##############################',
  '##############################',
  '##############################',
];

export default {
  id: 'neu',
  node: 'neu',
  title: 'Northeastern',
  sub: 'B.S. CS + CE · expected May 2029',
  theme: 'neu',
  kit: 'neu',
  skin: 'neu',
  music: 'neu',
  goal: 'Class of 2029',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([HUNTINGTON, ROADWORK, STREETCAR, CAMPUS, QUAD]),
      band: 'red.2',
      facts: { S: ['e-neu'] },
      duck: ['Hop on the streetcar roof. It runs up to campus.'],
      ports: [{ to: 'hall', exit: 0 }, { to: 'hall', exit: 1 }],
      marks: {
        1: { type: 'neuGate', title: 'Northeastern University', sub: 'Boston, MA' },
        2: { type: 'neuStreetcar', len: 11, dest: 'Northeastern' },
        3: { type: 'neuStop', w: 5 },
        4: { type: 'neuBarrier' },
        5: { type: 'neuFacade', w: 6, title: 'Lecture hall' },
        9: { type: 'neuSnow', n: 30 },
        '&': { type: 'neuDeadline', leash: 2 },
      },
    },
    hall: {
      kit: 'neuHall',
      theme: 'neuHall',
      camera: 'fixed',
      safe: true,
      band: 'red.2',
      map: HALL,
      facts: { books: ['e-neu-courses'] },
      ports: [{ to: 'main', exit: 0 }, { to: 'main', exit: 1 }],
      marks: {
        1: { type: 'neuBooks', span: [64, 384], rise: [176, 96] },
        2: { type: 'neuBoard', w: 9, h: 4.5 },
      },
    },
  },
};

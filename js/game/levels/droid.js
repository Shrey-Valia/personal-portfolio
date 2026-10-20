// DROID STRIKE BACK · hackathon, San Francisco, Nov 2025 (1st place, Omi
// category). Beats: the street and the brief (a-droid-build) → a voice pad:
// "Forward", and the rescue robot drives into a collapsed floor so you can
// cross on its back → "Extinguish": it foams a wall of fire away → vents
// that flare in a rolling pattern → stand on its deck: "Lift", and its
// scissor lift raises you to the upper floor → smoke, burnt planks, a vent
// and an ember over the collapse → out the window and down the fire escape, where
// the robot waits with the 1st-place trophy (a-droid) → EXIT.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/droid.js';

// outside: the brief, a voice pad and the robot parked by the door
const STREET = [
  '8',
  '',
  '........0.............##',
  '......................##',
  '......................##',
  '......................##',
  '......................##',
  '',
  '',
  '',
  '..@.S.N....2...1',
  '########################',
  '########################',
  '########################',
];

// the ground floor: a collapsed floor the robot bridges (FORWARD), a
// fire wall it foams away (EXTINGUISH), fire vents, the lift shaft
const GROUND = [
  '',
  '',
  '',
  '',
  '.........................................................C',
  '###################################################.....##',
  '###################################################.....##',
  '.......................4................................##',
  '........................................................##',
  '...c.c.c....................................c.c.c.......##',
  '.....C.............3.......C...5....5....5..............##',
  '##########....############################################',
  '##########....############################################',
  '##########....############################################',
];

// the upper floor, over the collapsed half of the building: smoke, a gap,
// burnt planks, another vent, a gap, an ember, the window out
const UPPER = [
  '...........................................................##',
  '...........................................................##',
  '........w',
  '.................c.c.............c..............c.c.c',
  '..................................5.................j',
  '##############..#####6.........############..################',
  '##############..#####..........############..################',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
  '.....#....#.........................#...............#......##',
];

// down the fire escape to the street, the trophy and the exit
const EXIT = [
  '',
  '',
  '',
  '',
  '',
  '====',
  '',
  '....===',
  '',
  '.......===',
  '................9.....G',
  '##############################',
  '##############################',
  '##############################',
];

export default {
  id: 'droid',
  node: 'droid',
  title: 'Droid Strike Back',
  sub: 'Hackathon · San Francisco · Nov 2025',
  theme: 'droid',
  kit: 'droid',
  music: 'droid',
  goal: 'Exit',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([STREET, GROUND, UPPER, EXIT]),
      facts: { S: ['a-droid-build'], trophy: ['a-droid'] },
      duck: ['Stand on a voice pad. Omi hears the command, and the robot carries it out.'],
      marks: {
        0: { type: 'banner', text: 'Droid Strike Back', sub: 'Hackathon · San Francisco', post: 118 },
        1: { type: 'droid.robot', gap: 34, spray: 38, shaft: 76, liftTo: 5, end: 153, handoff: [110, 127] },
        2: { type: 'droid.pad', cmd: 'Forward', step: 0 },
        3: { type: 'droid.pad', cmd: 'Extinguish', step: 1 },
        4: { type: 'droid.fireWall', w: 2, h: 4 },
        5: { type: 'droid.vent' },
        6: { type: 'droid.planks', n: 5, w: 2 },
        8: { type: 'droid.scene', building: [22, 143], collapse: [82, 141], holes: [[34, 38]], street: [[0, 22], [143, 173]], exit: [137, 2.2] },
        9: { type: 'droid.trophy', fact: 'a-droid' },
      },
    },
  },
};

// LIGHTHOUSE · contact. A night harbor: three signal boxes on the dock hold
// the ways to reach Shrey (email, LinkedIn, GitHub), and each one you hit
// lights a cable into the tower. Climb the spiral stair inside, read the
// plaque on the lamp, and light the beacon to finish. Open from the start,
// no enemies, no pits: contact info is never behind a hard jump.

import '../../themes/lighthouse.js';

const HARBOR = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '................5',
  '..........==============',
  '............#........#',
  '............#........#',
  '............#....====#',
  '............#........#',
  '............#........#',
  '............#====....#',
  '............#..c.....#',
  '............#........#',
  '............#....====#',
  '............#.....c..#',
  '............#........#',
  '............#====....#',
  '............#..c.....#',
  '............#........#',
  '............#....====#',
  '............#.....c..#',
  '............#........#',
  '............#====....#',
  '............#..c.....#',
  '............#........#',
  '............#....====#',
  '............#.....c..#',
  '............#........#',
  '............#====....#',
  '............#..c.....#',
  '...2..3..4..#........#',
  '............#....====#',
  '.....................#',
  '1N@..................#',
  '##############################',
  '##############################',
  '##############################',
];

const CONTACTS = [
  { mark: 2, fact: 'c-email', glyph: 'mail', color: 'gold' },
  { mark: 3, fact: 'c-linkedin', glyph: 'card', color: 'cyan' },
  { mark: 4, fact: 'c-github', glyph: 'code', color: 'green' },
];

const marks = {
  1: { type: 'harborTower', door: 12 },
  5: { type: 'harborBeacon', plaque: 'c-open' },
};
for (const c of CONTACTS) marks[c.mark] = { type: 'harborSignal', fact: c.fact, glyph: c.glyph, color: c.color };

export default {
  id: 'lighthouse',
  node: 'lighthouse',
  title: 'Lighthouse',
  sub: 'Contact · light the beacon',
  theme: 'harbor',
  kit: 'harbor',
  music: 'lighthouse',
  goal: null,                       // the beacon ends the level, with its own end screen
  safe: true,
  start: 'main',
  rooms: {
    main: {
      map: HARBOR,
      camera: 'vertical',
      // signal boxes and the plaque come from the marks; listed for the coverage report
      facts: { signals: CONTACTS.map((c) => c.fact), plaque: ['c-open'] },
      duck: ['Hit the boxes for contact links, then climb up and light the beacon.'],
      marks,
    },
  },
};

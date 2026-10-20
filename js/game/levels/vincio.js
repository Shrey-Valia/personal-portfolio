// VINCIO STUDIO · AI video editor, Jan–Aug 2026. The level is a video
// timeline: the ground is video clips, one-ways are audio clips.
// Beats: the studio sign → raw clips plus a written vision snap into a
// finished cut (raw clips in, finished cut out) → four agents wake up and
// each edit an obstacle away: B-roll selection bridges a gap, motion
// graphics keyframes a lift, a transition dissolves a hard cut, on-screen
// text types a caption you walk on → a port into BACKSTAGE (database,
// agent layer and memory, auth, front end) → dropped frames → EXPORT.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/vincio.js';

const LOBBY = [
  '',
  '',
  '',
  '................1',
  '',
  '',
  '......................c.c.c',
  '............K',
  '.....................======',
  '',
  '..@..N...S....................e',
  '##################################',
  '##################################',
  '##################################',
];

const CUT = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '......F',
  '............c.c.c',
  '',
  '.........................C',
  '##########2.......##############',
  '##########........##############',
  '##########........##############',
];

const AGENTS = [
  '...............................6',
  '',
  '',
  '',
  '...................................c.c.c',
  '...3',
  '.........................################',
  '...F.....................################',
  '.........................##################',
  '.........................##################',
  '.....................5...####################.............C',
  '########4.....##################################7.....##########',
  '########......##################################......##########',
  '########......##################################......##########',
];

const RACK = [
  '.......###',
  '.......###',
  '.......###',
  '.......###',
  '.......###',
  '.......###',
  '.......###',
  '.......###',
  '...8...###',
  '.......###',
  '...P...###..P',
  '##################',
  '##################',
  '##################',
];

const FINAL = [
  '',
  '',
  '',
  '',
  '',
  '..............................................9',
  '...............c.c.......c.c',
  '',
  '..............====......=====',
  '',
  '........e.......q..........e...........q......G',
  '##########..########..##########..##################',
  '##########..########..##########..##################',
  '##########..########..##########..##################',
];

const BACKSTAGE = [
  '##############################',
  '#9...........................#',
  '#............................#',
  '#.............F..............#',
  '#............................#',
  '#............................#',
  '#.........................P..#',
  '#.........####################',
  '#.........####################',
  '#.........####################',
  '#.P.......####################',
  '##############################',
  '##############################',
  '##############################',
];

const AGENTS_FACT = 'p-vincio-2';

export default {
  id: 'vincio',
  node: 'vincio',
  title: 'Vincio Studio',
  sub: 'AI video editor · Jan–Aug 2026',
  theme: 'studio',
  kit: 'studio',
  skin: 'studio',
  music: 'studio',
  goal: 'Export',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([LOBBY, CUT, AGENTS, RACK, FINAL]),
      facts: { S: ['p-vincio'], F: ['p-vincio-1', 'p-vincio-2'] },
      duck: ['Hit >_ blocks from below to log facts. Here the timeline is the level.'],
      ports: [{ to: 'backstage', exit: 0 }, { to: 'backstage', exit: 1 }],
      marks: {
        1: { type: 'banner', text: 'Vincio', sub: 'AI video editor', post: 102 },
        2: { type: 'vincio.cut', fact: 'p-vincio-1', clips: 4, w: 2, order: [2, 0, 3, 1], vision: [-9, -7, 4, 3] },
        3: { type: 'vincio.label', text: 'Agents offline', done: 'Agents online', fact: AGENTS_FACT, dx: 8, dy: 0 },
        4: { type: 'vincio.broll', fact: AGENTS_FACT, name: 'B-roll agent', w: 6, bin: [0, -8], pick: 2, agent: [-2, -6], trigger: -5 },
        5: { type: 'vincio.motion', fact: AGENTS_FACT, name: 'Motion agent', w: 3, from: [-2, -0.5], to: [4, -4], agent: [-4, -5], trigger: -4 },
        6: { type: 'vincio.dissolve', fact: AGENTS_FACT, name: 'Transition agent', w: 2, h: 6, agent: [-3, 3], trigger: -3 },
        7: { type: 'vincio.caption', fact: AGENTS_FACT, name: 'Text agent', w: 6, text: 'On-screen text', agent: [-3, -6], trigger: -4 },
        8: { type: 'vincio.label', text: 'Backstage', dx: 16, dy: 0, color: '#6fd6c8' },
        9: { type: 'vincio.render', file: 'final_cut.mp4' },
      },
    },
    backstage: {
      kit: 'studioDark',
      theme: 'studioDark',
      camera: 'fixed',
      safe: true,
      band: 'cyan.2',
      map: BACKSTAGE,
      facts: { F: ['p-vincio-3'] },
      ports: [{ to: 'main', exit: 0 }, { to: 'main', exit: 1 }],
      marks: {
        // coordinates are absolute room tiles
        9: {
          type: 'vincio.backstage', fact: 'p-vincio-3',
          db: [[6, 9, 2], [8, 7, 4]],                       // [col, top row, height]
          auth: [20, 1, 6],                                 // door: col, top row, height
          memory: [15.5, 2.6],
          front: [21, 2.8, 5, 3.2],                         // browser window: col, row, w, h
          crew: [[11.5, 6.4, 'video'], [13.5, 6.4, 'fx'], [16.5, 6.4, 'trans'], [18.5, 6.4, 'text']],
          links: [[[7, 9], [7, 5.5], [11.5, 5.5]], [[16.5, 6], [16.5, 4.8]], [[18.5, 5.5], [21.2, 5.5]]],
          labels: [['Database', 7.5, 4.6], ['Agent layer', 12, 4.6], ['Front end', 23.5, 2]],
        },
      },
    },
  },
};

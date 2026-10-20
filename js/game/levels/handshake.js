// LABEL FACTORY · Handshake AI, AI Training Specialist, Jan–May 2026.
// Beats: the factory gate and role sign → the labeling line, where
// mislabeled cards walk the floor and a stomp audits them (x-hs-1), and a
// stamp press checks cards against a rubric → a rope bridge of pure noise
// that the DENOISE block resolves over 20 diffusion steps (x-hs-2), then
// stepping stones a fine-tuned model denoises as you go → a port into the
// FAILURE GALLERY, where feedback fixes broken generations (x-hs-3) →
// noise clouds over cloud gaps → SUBMIT BATCH.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/handshake.js';

const GATE = [
  '',
  '',
  '',
  '...........1',
  '',
  '',
  '.......................c.c.c',
  '...............K',
  '......................======',
  '',
  '..@..N....S',
  '################################',
  '################################',
  '################################',
];

// the labeling line: a mislabel walking between two crates, the x-hs-1
// block, then the audit belt under the stamp press, and the checkpoint
const LINE = [
  '',
  '',
  '',
  '',
  '',
  '............................2',
  '',
  '.....c.c.c..........F',
  '',
  '',
  '..#.......m...#.........................C.....#',
  '#######################>>>>>>>>>>>>>############',
  '################################################',
  '################################################',
];

// diffusion: a second mislabel between crates, the DENOISE block, the
// noise bridge, then fine-tuned stepping stones to the gallery port
const DIFFUSION = [
  '................................................##',
  '................................................##',
  '................................................##',
  '................................................##',
  '................................................##',
  '................................................##',
  '.....................................c.c........##',
  '............F...................................##',
  '................................................##',
  '..............................................P.##',
  '.m...#..........................................##',
  '###############3...........#####4..........#######',
  '###############............#####...........#######',
  '###############............#####...........#######',
];

// after the gallery: noise clouds over cloud gaps, a last mislabel, the goal
const FINAL = [
  '',
  '',
  '',
  '',
  '',
  '',
  '.........c.c.c...........c.c.c',
  '',
  '...........z..........z',
  '.P',
  '................................#..m..#..G',
  '###############..###########..##############',
  '###############..###########..##############',
  '###############..###########..##############',
];

const GALLERY = [
  '##############################',
  '#............................#',
  '#.......1.....2.....3........#',
  '#............................#',
  '#.4..........................#',
  '#............................#',
  '#............................#',
  '#...............F............#',
  '#............................#',
  '#P.........................P.#',
  '#............................#',
  '##############################',
  '##############################',
  '##############################',
];

export default {
  id: 'handshake',
  node: 'handshake',
  title: 'Label Factory',
  sub: 'Handshake AI · AI training · Jan–May 2026',
  theme: 'labelFactory',
  kit: 'labelFactory',
  music: 'labelFactory',
  goal: 'Submit batch',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([GATE, LINE, DIFFUSION, FINAL]),
      band: 'orange.2',
      facts: { S: ['x-hs'], F: ['x-hs-1', 'x-hs-2'] },
      duck: ['Jump on mislabeled cards to audit them. The press lamp blinks before it stamps.'],
      ports: [{ to: 'gallery', exit: 0 }, { to: 'gallery', exit: 1 }],
      marks: {
        1: { type: 'hsGate', w: 8, text: 'Handshake AI', sub: 'Label factory · remote' },
        2: {
          type: 'hsAudit', belt: [55, 68], period: 150,
          rubric: { dx: -7, dy: -2, title: 'Quality rubric', rows: ['Label correct', 'Safe content', 'Clear image'] },
        },
        3: { type: 'hsDenoise', fact: 'x-hs-2', img: 'bridge', segs: [[0, 0, 12]], prompt: 'a rope bridge', panel: [-6, -8] },
        4: {
          type: 'hsDenoise', auto: true, img: 'stones', title: 'Fine-tuned on your ratings',
          segs: [[0, -1, 2], [3, -2, 2], [6, -2, 2], [9, -1, 2]], prompt: 'stepping stones', panel: [-3, -8],
        },
      },
    },
    gallery: {
      kit: 'labelGallery',
      theme: 'labelGallery',
      camera: 'fixed',
      safe: true,
      band: 'orange.2',
      facts: { F: ['x-hs-3'] },
      ports: [{ to: 'main', exit: 0 }, { to: 'main', exit: 1 }],
      map: GALLERY,
      marks: {
        1: { type: 'hsFrame', kind: 'hand', w: 5, h: 3, fact: 'x-hs-3', delay: 0 },
        2: { type: 'hsFrame', kind: 'sign', w: 5, h: 3, fact: 'x-hs-3', delay: 24 },
        3: { type: 'hsFrame', kind: 'cube', w: 5, h: 3, fact: 'x-hs-3', delay: 48 },
        4: {
          type: 'hsWallText', text: 'Failure gallery', sub: 'Recurring failure cases',
          subDone: 'Fixed with feedback ✓', fact: 'x-hs-3', hint: [16, 8.2, 'Send feedback: hit >_'],
        },
      },
    },
  },
};

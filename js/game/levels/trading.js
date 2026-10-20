// TRADING FLOOR · deep RL trading bot, Apr–Aug 2024. The ground is the
// equity curve. Beats: the sign and the simulated-portfolio banner →
// AUTOPILOT: the RL agent's cart carries you across asset-class panels
// with your controls locked (without manual input) → ALIGN: bad ticks are
// cleaned out and two feeds slide into time alignment, stacking into
// stairs (one consistent dataset) → a port into the TRAINING GYM (a
// Q-table floor, Q-learning and PPO panels, an entry-signal launch pad) →
// candles that rise (hollow, up) or sink (filled, down) under you →
// walk-forward folds climb to the backtest results → EXECUTE.
// The only figures shown are parsed from the résumé text at runtime.

import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/trading.js';

const OPEN = [
  '',
  '',
  '..............1',
  '',
  '',
  '',
  '',
  '....................K...ccc',
  '...............................e',
  '............................########',
  '..@..N..S...######....##############',
  '####################################',
  '####################################',
  '####################################',
];

const AUTOPILOT = [
  '',
  '',
  '',
  '',
  '',
  '...F......................cc',
  '',
  '..............................C',
  '.......................###############',
  '#########2.............###############',
  '#########..............###############',
  '#########..............###############',
  '#########..............###############',
  '#########..............###############',
];

const ALIGN = [
  '',
  '',
  '',
  '',
  '..F',
  '....................############',
  '....................############',
  '....................############',
  '####................############',
  '######..............############',
  '########...........3############',
  '################################',
  '################################',
  '################################',
];

const GYM = [
  '.............##',
  '.............##',
  '.............##',
  '.............##',
  '.........4...##',
  '####.........##',
  '######.......##',
  '########.P...##.P',
  '####################',
  '####################',
  '####################',
  '####################',
  '####################',
  '####################',
];

const CANDLES = [
  '',
  '',
  '',
  '',
  '........................c',
  '',
  '................c...c............e',
  '...........................#########',
  '####.......................#########',
  '######.....................#########',
  '########..C................#########......u',
  '##############5............###################',
  '##############.............###################',
  '##############.............###################',
];

const RESULTS = [
  '',
  '',
  '..................7',
  '................F',
  '',
  '',
  '..............................G',
  '.............#######################',
  '.............#######################',
  '.............#######################',
  '..6..........#######################',
  '####################################',
  '####################################',
  '####################################',
];

const GYM_ROOM = [
  '##############################',
  '#3...........................#',
  '#............................#',
  '#........................4...#',
  '#............................#',
  '#........................P...#',
  '#......................#######',
  '#...........F..........#######',
  '#......................#######',
  '#......................#######',
  '#.P.1................2.#######',
  '##############################',
  '##############################',
  '##############################',
];

export default {
  id: 'trading',
  node: 'trading',
  title: 'Trading Floor',
  sub: 'Deep RL trading bot · Apr–Aug 2024',
  theme: 'trading',
  kit: 'trading',
  skin: 'trading',
  music: 'trading',
  goal: 'Execute',
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([OPEN, AUTOPILOT, ALIGN, GYM, CANDLES, RESULTS]),
      facts: { S: ['p-trade'], F: ['p-trade-1', 'p-trade-2', 'p-trade-4'] },
      duck: ['The ground is the equity curve. Hit >_ blocks from below to log facts.'],
      ports: [{ to: 'gym', exit: 0 }, { to: 'gym', exit: 1 }],
      marks: {
        1: { type: 'trade.banner', text: 'Simulated portfolio', from: 'p-trade-1', post: 102 },
        2: {
          type: 'trade.autopilot', fact: 'p-trade-1', w: 3,
          // the cart's top-left along a price line, in tiles from the mark
          path: [[0, 0], [2, -1], [4, 0.5], [6, -1.5], [8, -0.5], [11, -1]],
          panels: [[0.6, 2.2, 3.6, 2.5, 'line'], [4.7, 2.2, 3.6, 2.5, 'bars'], [8.8, 2.2, 3.6, 2.5, 'candles']],
        },
        3: {
          type: 'trade.align', fact: 'p-trade-2',
          rails: [
            { name: 'Level II order flow', dx: -4, dy: -1, w: 5, off: -6, phase: 5, bad: [1, 3], color: 'cyan' },
            { name: 'Microstructure', dx: -3, dy: -3, w: 4, off: -10, phase: 3, bad: [2], color: 'gold' },
          ],
          table: [1, -4, 5, 4],
        },
        4: { type: 'trade.label', text: 'Training gym', dx: 16, dy: 0, color: '#ffe08a' },
        5: {
          type: 'trade.candles', w: 48,
          // [dx, dy, kind, travel px]: up candles rise when stood on, down candles sink;
          // the last one lifts you level with the terrace
          list: [[1, -1, 'up', 32], [5, -2, 'down', 16], [9, -2, 'up', 32]],
        },
        6: { type: 'trade.walkforward', folds: 4, train: 3, test: 2, shift: 2, rise: 16 },
        7: { type: 'trade.results', fact: 'p-trade-4', w: 7, h: 3.5 },
      },
    },
    gym: {
      kit: 'tradingGym',
      theme: 'tradingGym',
      camera: 'fixed',
      safe: true,
      band: 'gold.2',
      map: GYM_ROOM,
      facts: { F: ['p-trade-3'] },
      ports: [{ to: 'main', exit: 0 }, { to: 'main', exit: 1 }],
      marks: {
        1: { type: 'trade.qtable', fact: 'p-trade-3', w: 17 },
        2: { type: 'trade.spring', fact: 'p-trade-3', w: 2 },
        // panel rects are absolute room tiles: col, row, w, h
        3: { type: 'trade.models', fact: 'p-trade-3', q: [3, 2, 7, 3.6], ppo: [14, 2, 7, 3.6] },
        4: { type: 'trade.label', text: 'Exit ▼', dx: 16, dy: 0, color: '#ffe08a' },
      },
    },
  },
};

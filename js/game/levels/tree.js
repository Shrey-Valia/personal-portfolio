// TECH TREE · skills. A vertical climb up one big tree, a tier per skill
// category in the résumé, roots to crown: languages are the roots, data and
// scientific computing the trunk, machine learning a canopy wired as a
// neural network, web and backend a client and a server strung together,
// tools and infrastructure the crown in the clouds. Each tier's bricks are
// generated from its [data-skill] items. No enemies and no pits: a fall
// just lands you on a lower branch.

import '../../themes/tree.js';

const TREE = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '................G',
  '.............=======',
  '...............c.c',
  '',
  '....................====',
  '.....................c',
  '',
  '......................====',
  '',
  '.........6',
  '...========================',
  '',
  '',
  '....====',
  '.....c',
  '',
  '.====',
  '..c',
  '',
  '....====',
  '.....c',
  '',
  '.====',
  '',
  '......................5',
  '...========================',
  '',
  '',
  '........................====',
  '.........................c',
  '',
  '.....................====',
  '......................c',
  '',
  '.........................====',
  '........................c',
  '',
  '......................====',
  '',
  '.........4',
  '....======================',
  '',
  '',
  '.....====',
  '......c',
  '',
  '.====',
  '...cc',
  '',
  '....====',
  '',
  '1....................3',
  '########################===###',
  '########################...###',
  '########################...###',
  '########################===###',
  '',
  '',
  '.......................=====',
  '.........................c',
  '',
  '........................====',
  '.....................cc',
  '',
  '....................====',
  '',
  '.N.@......2',
  '##############################',
  '##############################',
  '##############################',
];

// one entry per tier, bottom to top. The mark is the tier's sign; its
// bricks hang 3 rows above it (a comfortable bump from the tier floor),
// centred on column cx.
const TIERS = [
  { mark: 2, fact: 's-lang', look: 'roots' },
  { mark: 3, fact: 's-data', look: 'data' },
  { mark: 4, fact: 's-ml', look: 'neural' },
  { mark: 5, fact: 's-web', look: 'web' },
  { mark: 6, fact: 's-tools', look: 'crown' },
];

const marks = { 1: { type: 'tree', cx: 15 } };
for (const t of TIERS) marks[t.mark] = { type: 'tier', fact: t.fact, look: t.look, cx: 15, dy: -3 };

export default {
  id: 'tree',
  node: 'tree',
  title: 'Tech Tree',
  sub: 'Skills · climb from the roots to the crown',
  theme: 'tree',
  kit: 'tree',
  music: 'tree',
  goal: 'Tree top',
  safe: true,                       // a bonus level: no enemies, no pits, no deaths
  start: 'main',
  rooms: {
    main: {
      map: TREE,
      camera: 'vertical',
      // tier signs are placed by the tier marks; listed here for the coverage report
      facts: { tiers: TIERS.map((t) => t.fact) },
      duck: ['Hit bricks from below to collect skills. Falling just lands you lower.'],
      marks,
    },
  },
};

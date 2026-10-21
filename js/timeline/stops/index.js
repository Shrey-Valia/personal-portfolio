// The frozen stop list: every stop's id, the facts its card holds, and its
// file. Nobody edits this after M1. The order the stops appear on the page
// is the order of the [data-stop] articles in index.html; the ?debug=1
// check fails if the two disagree.

export const LIST = [
  { id: 'intro', facts: ['p-name', 'c-email', 'c-linkedin', 'c-github', 'c-open'], load: () => import('./intro.js') },
  { id: 'vincio', facts: ['p-vincio', 'p-vincio-1', 'p-vincio-2', 'p-vincio-3'], load: () => import('./vincio.js') },
  { id: 'ornl', facts: ['x-ornl', 'x-ornl-1', 'x-ornl-2', 'x-ornl-3', 'x-ornl-4'], load: () => import('./ornl.js') },
  { id: 'handshake', facts: ['x-hs', 'x-hs-1', 'x-hs-2', 'x-hs-3'], load: () => import('./handshake.js') },
  { id: 'droid', facts: ['a-droid', 'a-droid-build'], load: () => import('./droid.js') },
  { id: 'neu', facts: ['e-neu', 'e-neu-courses'], load: () => import('./neu.js') },
  { id: 'dhs', facts: ['e-dhs'], load: () => import('./dhs.js') },
  { id: 'edulearn', facts: ['a-edulearn'], load: () => import('./edulearn.js') },
  { id: 'trading', facts: ['p-trade', 'p-trade-1', 'p-trade-2', 'p-trade-3', 'p-trade-4'], load: () => import('./trading.js') },
  { id: 'skills', facts: ['s-lang', 's-data', 's-ml', 's-web', 's-tools'], load: () => import('./skills.js') },
  { id: 'contact', facts: [], load: () => import('./contact.js') },
];

export const STOP_IDS = LIST.map((s) => s.id);

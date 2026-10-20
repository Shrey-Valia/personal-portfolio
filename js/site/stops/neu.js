// NORTHEASTERN · B.S. CS + CE, expected May 2029. Snowy brick campus;
// he catches one floating textbook per course (from data-credit).
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'neu',
  order: 40,
  node: '#neu',
  factIds: ['e-neu', 'e-neu-courses'],
  kind: 'Education',
  nav: 'Education',
  leave: 'walk',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('neu', { sky: ['#9fb5d6', '#e3ebf6'], ground: 'white.1', edge: 'white.2' }),
});

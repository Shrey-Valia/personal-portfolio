// DUBLIN HIGH · diploma, Aug 2021 – Jun 2025. Navy and red school,
// lockers, "Class of 2025", a cap toss.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'dhs',
  order: 60,
  node: '#dhs',
  factIds: ['e-dhs'],
  kind: 'Education',
  leave: 'walk',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('dhs', { sky: ['#6aa6f2', '#c8e4fd'] }),
});

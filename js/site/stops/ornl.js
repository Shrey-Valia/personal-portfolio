// OAK RIDGE · ML research, Jan–May 2026. Jittering monomers snap into
// a bonded chain (GNN self-assembly); a RUN bar fills in a browser window
// (the web tool); sliders rise from target properties (inverse design);
// GPU racks blink in lockstep.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'ornl',
  order: 20,
  node: '#ornl',
  factIds: ['x-ornl', 'x-ornl-1', 'x-ornl-2', 'x-ornl-3', 'x-ornl-4'],
  kind: 'Research',
  nav: 'Experience',
  lead: 'x-ornl-1',
  chips: ['PyTorch · TensorFlow', 'Graph neural networks', 'With Dr. Rajeev Kumar'],
  leave: 'walk',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('ornl', { sky: ['#1a2238', '#33456a'], ground: 'steel.2', edge: 'steel.4' }),
});

// SKILLS · he climbs a small tech tree; each tier's bricks pop skill
// chips. The skills themselves are the HTML card.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'skills',
  order: 90,
  node: '#skills',
  factIds: ['s-lang', 's-data', 's-ml', 's-web', 's-tools'],
  kind: 'Skills',
  nav: 'Skills',
  places: ['tree'],
  when: '',
  leave: 'climb',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('tree', { sky: ['#7ec4f0', '#d2ecfb'] }),
});

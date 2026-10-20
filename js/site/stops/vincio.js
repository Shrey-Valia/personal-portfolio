// VINCIO · AI video editor, Jan–Aug 2026. Raw clips and a written
// vision snap into an edit timeline; four agent bots (B-roll, motion,
// transition, text) each add their piece; a render bar fills to
// final_cut.mp4.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'vincio',
  order: 10,
  node: '#vincio',
  factIds: ['p-vincio', 'p-vincio-1', 'p-vincio-2', 'p-vincio-3'],
  kind: 'Project',
  nav: 'Projects',
  lead: 'p-vincio-1',
  chips: ['Multi-agent AI', 'Front end + agent layer'],
  leave: 'hop',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('vincio', { sky: ['#151a33', '#2a3156'], ground: 'slate.1', edge: 'slate.3' }),
});

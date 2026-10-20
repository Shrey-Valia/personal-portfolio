// INTRO · Shrey's room in Dublin. He waves from his desk, grabs his
// backpack and steps onto the path. Name, role and contact are the card
// beside it (the résumé's own header, moved here).
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'intro',
  order: 0,
  node: 'header.resume__head',
  factIds: ['p-name', 'c-email', 'c-linkedin', 'c-github', 'c-open'],
  layout: 'intro',
  places: ['home'],
  enter: false,
  loop: 4,                         // the wave

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('home', { sky: ['#6aa6f2', '#9cc9fa', '#c8e4fd'], wave: true }),
});

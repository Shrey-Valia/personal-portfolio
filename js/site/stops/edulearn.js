// EDULEARN · hackathon, Oct 2024 (split out of the Dublin High entry).
// A laptop video call of webcam tiles; he climbs the podium to 1st;
// applause.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'edulearn',
  order: 70,
  node: '[data-fact="a-edulearn"]',
  factIds: ['a-edulearn'],
  kind: 'Award',
  head: { title: 'EduLearn Hackathon', meta: 'Oct 2024 · Dublin High School' },
  when: 'Oct 2024',
  chips: ['1st of 700+'],
  leave: 'slide',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('dhs', { sky: ['#2c3570', '#4a5cb0'], ground: 'wood.1', edge: 'wood.2' }),
});

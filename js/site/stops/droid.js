// DROID STRIKE BACK · hackathon, Nov 2025. Omi pendant on (this scene
// only), he says "Forward" (voice bubble with a waveform) and the orange
// tread robot with one cyan eye rolls through the burning building and
// foams the fire.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'droid',
  order: 50,
  node: '#droid',
  factIds: ['a-droid', 'a-droid-build'],
  kind: 'Award',
  chips: ['1st place', 'Omi category'],
  leave: 'hop',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('droid', { sky: ['#1a1030', '#4a1f3a', '#8f3a2a'], ground: 'slate.1', edge: 'slate.2' }),
});

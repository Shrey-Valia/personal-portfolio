// HANDSHAKE AI · AI training, Jan–May 2026. Cards on a belt get Pass /
// Flag stamps against a rubric; static denoises into a clean image,
// "Fine-tuned on my annotations"; three failures get fixed (six fingers,
// "Helo wrold", the wrong-colour cube).
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'handshake',
  order: 30,
  node: '#handshake',
  factIds: ['x-hs', 'x-hs-1', 'x-hs-2', 'x-hs-3'],
  kind: 'Work',
  lead: 'x-hs-2',
  chips: ['Quality + safety rubrics', 'Diffusion fine-tuning'],
  leave: 'slide',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('handshake', { sky: ['#8fb4d9', '#dce8f3'], ground: '#b8ae96', edge: '#e9e2d0' }),
});

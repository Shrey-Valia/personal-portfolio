// CONTACT · night harbor. He climbs to the lighthouse and lights the
// beacon. Big email / LinkedIn / GitHub buttons below.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';
import { contactCard } from '../cards.js';

registerStop({
  id: 'contact',
  order: 100,
  node: contactCard,              // built: the lead line and the links in full
  factIds: [],
  layout: 'end',
  nav: 'Contact',
  places: ['lighthouse'],
  anchor: 'h-contact',
  exit: false,

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('lighthouse', { sky: ['#0e1433', '#1d2756', '#2c3570'], ground: 'slate.1', edge: 'indigo.2' }),
});

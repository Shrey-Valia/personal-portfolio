// TRADING BOT · deep RL, Apr–Aug 2024. He rides the RL agent's
// autopilot cart along the equity curve; feeds slide into alignment;
// 43% and 2.76 trophies.
//
// PLACEHOLDER scene: the map landmark and Shrey's standard visit. The
// scene builder replaces build/draw (and sets keyPose, size, leave, loop);
// the card fields above them are the content, so leave those alone.

import { registerStop } from '../api.js';
import { placeholder } from '../placeholder.js';

registerStop({
  id: 'trading',
  order: 80,
  node: '#trading',
  factIds: ['p-trade', 'p-trade-1', 'p-trade-2', 'p-trade-3', 'p-trade-4'],
  kind: 'Project',
  lead: 'p-trade-4',
  chips: ['43% win rate', '2.76 profit factor', '$50K simulated portfolio'],
  leave: 'walk',

  // the scene
  size: [320, 160],
  keyPose: 0.5,
  ...placeholder('trading', { sky: ['#0b1530', '#1a2f5c'], ground: 'slate.1', edge: 'slate.3' }),
});

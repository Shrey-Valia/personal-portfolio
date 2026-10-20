// Level registry. A node on the map without an entry here is "in
// progress": the map shows it, and entering opens that résumé section.

import home from './home.js';
import ornl from './ornl.js';
import vincio from './vincio.js';
import trading from './trading.js';
import handshake from './handshake.js';
import droid from './droid.js';
import dhs from './dhs.js';
import neu from './neu.js';

export const LEVELS = { home, ornl, vincio, trading, handshake, droid, dhs, neu };

// every fact id a level can hand out (signs + blocks), for the coverage report
export function levelFacts(def) {
  const ids = [];
  for (const room of Object.values(def.rooms)) {
    for (const list of Object.values(room.facts || {})) ids.push(...list);
  }
  return ids;
}

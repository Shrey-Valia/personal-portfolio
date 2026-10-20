// Debug-time sanity checks for a level definition. Data mistakes (more
// F blocks than fact ids, a port pointing nowhere, a missing kit) would
// otherwise surface as undefined facts or a crash mid-game.

import { KITS } from '../../art/tiles.js';
import { hasBackground } from '../../art/backgrounds.js';
import { hasSkin } from '../../art/sprites/actors.js';
import { hasSong } from '../../engine/audio.js';
import { parseRows } from '../../engine/tilemap.js';
import { SETPIECES } from '../setpieces.js';
import { ENEMIES, RESERVED_CHARS } from '../enemies.js';

const TERRAIN = '.#=^<>';

export function validateLevel(def, content) {
  const out = [];
  const bad = (m) => out.push(def.id + ': ' + m);
  if (def.music && !hasSong(def.music)) bad(`music "${def.music}" isn't registered`);
  if (def.skin && !hasSkin(def.skin)) bad(`enemy skin "${def.skin}" isn't registered`);

  const portCounts = {};
  for (const [rid, R] of Object.entries(def.rooms)) {
    portCounts[rid] = parseRows(R.map).join('').split('P').length - 1;
  }

  for (const [rid, R] of Object.entries(def.rooms)) {
    const where = `room "${rid}"`;
    const kit = R.kit || def.kit, theme = R.theme || def.theme;
    if (!KITS[kit]) bad(`${where}: tile kit "${kit}" isn't registered`);
    if (!hasBackground(theme)) bad(`${where}: backdrop "${theme}" isn't registered`);
    const rows = parseRows(R.map);
    if (rows.length < 14) bad(`${where}: ${rows.length} rows; rooms need at least 14`);
    if (R.camera === 'fixed' && rows[0].length > 30) bad(`${where}: fixed rooms should be ≤ 30 columns; keep key things in the middle 24`);

    const n = { F: 0, S: 0, N: 0, P: 0 };
    const unknown = new Set();
    for (const row of rows) {
      for (const ch of row) {
        if (ch in n) n[ch]++;
        else if (!TERRAIN.includes(ch) && !RESERVED_CHARS.includes(ch) && !ENEMIES[ch] && !(R.marks && R.marks[ch])) unknown.add(ch);
      }
    }
    if (unknown.size) bad(`${where}: unknown map characters ${[...unknown].join(' ')}`);
    const facts = R.facts || {};
    const want = [['F', facts.F, 'facts.F'], ['S', facts.S, 'facts.S'], ['N', R.duck, 'duck'], ['P', R.ports, 'ports']];
    for (const [ch, list, name] of want) {
      const have = list ? list.length : 0;
      if (have !== n[ch]) bad(`${where}: ${n[ch]} "${ch}" on the map but ${have} entries in ${name}`);
    }
    for (const id of [...(facts.F || []), ...(facts.S || [])]) {
      if (!content.get(id)) bad(`${where}: fact id "${id}" isn't in index.html`);
    }
    for (const [i, link] of (R.ports || []).entries()) {
      if (link.to === '@map') continue;
      if (!def.rooms[link.to]) bad(`${where}: port ${i} goes to missing room "${link.to}"`);
      else if (!(link.exit < portCounts[link.to])) bad(`${where}: port ${i} exits at port ${link.exit} of "${link.to}", which has ${portCounts[link.to]}`);
    }
    for (const [ch, spec] of Object.entries(R.marks || {})) {
      if (!SETPIECES[spec.type]) bad(`${where}: mark "${ch}" uses unregistered set piece "${spec.type}"`);
    }
  }
  return out;
}

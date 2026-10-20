// Shrey Island: the overworld graph. Positions are in a 480×216 design
// space (critical content within the central 384 px). Edges are polylines.
// Contact (the lighthouse) and the main roads are open from the start.

export const NODES = {
  home:       { x: 232, y: 140, name: 'Home',          sub: 'Dublin, CA · start here',             theme: 'home' },
  tree:       { x: 128, y: 140, name: 'Tech Tree',     sub: 'Skills · 38 to collect',              theme: 'tree' },
  ornl:       { x: 336, y: 140, name: 'Oak Ridge Lab', sub: 'ML research · Jan–May 2026',          theme: 'lab' },
  dhs:        { x: 196, y: 178, name: 'Dublin High',   sub: 'Diploma · 1st of 700+',               theme: 'school' },
  neu:        { x: 104, y: 184, name: 'Northeastern',  sub: 'B.S. CS + CE · May 2029',             theme: 'campus' },
  droid:      { x: 300, y: 186, name: 'Droid Strike',  sub: 'Hackathon · 1st place · SF',          theme: 'fire' },
  lighthouse: { x: 410, y: 170, name: 'Lighthouse',    sub: 'Contact',                             theme: 'harbor' },
  vincio:     { x: 128, y: 58,  name: 'Vincio Studio', sub: 'AI video editor · 2026',              theme: 'studio' },
  trading:    { x: 232, y: 58,  name: 'Trading Floor', sub: 'Deep RL trading bot · 2024',          theme: 'trading' },
  handshake:  { x: 336, y: 58,  name: 'Label Factory', sub: 'Handshake AI · Jan–May 2026',         theme: 'factory' },
};

// open: () => boolean, given the set of cleared nodes
export const EDGES = [
  { a: 'home', b: 'tree',       pts: [[232, 140], [128, 140]] },
  { a: 'home', b: 'ornl',       pts: [[232, 140], [336, 140]] },
  { a: 'home', b: 'dhs',        pts: [[232, 140], [214, 160], [196, 178]] },
  { a: 'home', b: 'lighthouse', pts: [[232, 140], [262, 158], [360, 160], [410, 170]] },
  { a: 'tree', b: 'vincio',     pts: [[128, 140], [128, 58]], beam: true },
  { a: 'vincio', b: 'trading',  pts: [[128, 58], [232, 58]], needs: ['vincio'] },
  { a: 'ornl', b: 'handshake',  pts: [[336, 140], [336, 58]], beam: true, needs: ['ornl'] },
  { a: 'dhs', b: 'neu',         pts: [[196, 178], [150, 192], [104, 184]], needs: ['dhs'] },
  { a: 'neu', b: 'droid',       pts: [[104, 184], [140, 200], [256, 200], [300, 186]], needs: ['neu'] },
  { a: 'trading', b: 'handshake', pts: [[232, 58], [336, 58]], needs: ['trading', 'handshake'] },
];

export function edgeOpen(e, cleared, warped) {
  if (warped && (warped.has(e.a) && warped.has(e.b))) return true;
  return !e.needs || e.needs.every((n) => cleared.has(n));
}

// nodes reachable from home over open edges, plus anything fast-travelled to
export function reachable(cleared, warped) {
  const seen = new Set(['home']);
  const queue = ['home'];
  while (queue.length) {
    const n = queue.shift();
    for (const e of EDGES) {
      if (!edgeOpen(e, cleared, warped)) continue;
      const other = e.a === n ? e.b : e.b === n ? e.a : null;
      if (other && !seen.has(other)) { seen.add(other); queue.push(other); }
    }
  }
  if (warped) for (const n of warped) seen.add(n);
  return seen;
}

// shortest route over open edges: list of [edge, forward] steps
export function route(from, to, cleared, warped) {
  if (from === to) return [];
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift();
    if (n === to) break;
    for (const e of EDGES) {
      if (!edgeOpen(e, cleared, warped)) continue;
      const other = e.a === n ? e.b : e.b === n ? e.a : null;
      if (other && !prev.has(other)) { prev.set(other, { n, e }); queue.push(other); }
    }
  }
  if (!prev.has(to)) return null;
  const steps = [];
  for (let cur = to; prev.get(cur); cur = prev.get(cur).n) {
    const { n, e } = prev.get(cur);
    steps.unshift({ edge: e, forward: e.a === n });
  }
  return steps;
}

// the locked edge's requirement, for the "clear X first" banner
export function lockReason(e) {
  return e.needs ? e.needs.map((n) => NODES[n].name).join(' + ') : '';
}

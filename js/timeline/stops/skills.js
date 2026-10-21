// Technical skills. A small tech tree on a bluff at dusk, five bands from
// the top down, each drawn as what its skill area is about (the game's
// Tech Tree theme, tree.js, compressed to 100 px):
//   crown   tools and infrastructure: the top branches are a git graph
//   web     web and backend: a wire from a browser window to a server
//   neural  machine learning: a small network in the canopy
//   data    data and scientific computing: sap streams, a scatter plot cut in the bark
//   roots   languages: roots in the soil, code syntax pressed into it
// He comes in at the top commit and climbs down the trunk; each band's
// brick pops and the band lights as he passes it, and he lands in the
// roots. The 38 skills are the card's chips, so the scene names none.
//
// tierIcons() gives the five lit bricks as small canvases for the card's
// group headings (keyed by fact id); the page owner places them.
//
// transit (T9, to Contact): he climbs down roots knotted into a ladder on
// the bluff face, then steps onto the dock planks.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 10, §2 T9. Contract: docs/BUILDING-STOPS.md.

import { drawPath, sky, fadeEdges, coreX } from '../kit.js';
import { col } from '../../art/palette.js';
import { disc, line, noise1 } from '../../art/draw.js';
import { makeCanvas, rng, clamp, lerp, ease } from '../../engine/util.js';

const INK = col('ink.0');
const R = (g, x, y, w, h, c) => { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), w, h); };

const SOIL = { base: '#3d2718', mid: '#4d3220', hi: '#6c4b31', lo: '#26170e', cave: '#1c120b' };
const BARK = { hi: col('#a8703c'), mid: col('#7c4b2a'), lo: col('#5a341d'), dk: col('wood.0') };   // wood at dusk
const ROOT = { hi: col('#a8733f'), mid: col('#7a522f'), lo: col('#4e331d') };
const LEAF = { edge: col('#122219'), lo: col('#1d3a2a'), mid: col('#2a5238'), hi: col('#3f7447') };   // tree.js LEAF at dusk
const RAMP = { roots: 'orange', data: 'cyan', neural: 'magenta', web: 'green', crown: 'gold' };

// ─── the bricks (tree.js GLYPHS and brickArt) ─────────────────────────

const GLYPHS = {
  code: ['..x..x.x..', '..x..x.x..', '.x...x..x.', 'x...x....x', '.x..x...x.', '..x.x..x..', '..x.x..x..'],
  gear: ['....xx....', '.x.xxxx.x.', '..xxxxxx..', '.xxx..xxx.', 'xxx....xxx', 'xxx....xxx', '.xxx..xxx.', '..xxxxxx..', '.x.xxxx.x.', '....xx....'],
  grid: ['xx.xx.xx', 'xx.xx.xx', '........', 'xx.xx.xx', 'xx.xx.xx', '........', 'xx.xx.xx', 'xx.xx.xx'],
  window: ['xxxxxxxxxx', 'x.x.xxxxxx', 'xxxxxxxxxx', 'x........x', 'x.xxxx...x', 'x........x', 'x.xxxxxx.x', 'xxxxxxxxxx'],
};
const GLYPH_OF = { roots: 'code', data: 'grid', neural: 'neuron', web: 'window', crown: 'gear' };

function glyph(g, name, color) {
  g.fillStyle = color;
  const map = GLYPHS[name];
  if (map) {
    const ox = Math.floor((16 - map[0].length) / 2), oy = Math.floor((16 - map.length) / 2);
    map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') g.fillRect(ox + i, oy + j, 1, 1); }));
  } else if (name === 'neuron') {
    // three inputs feeding one node: a tiny network diagram
    for (const [sy, ey] of [[3, 7], [7, 8], [11, 9]]) { g.fillRect(3, sy, 2, 2); line(g, 5, sy + (sy < 7 ? 1 : sy > 7 ? 0 : 1), 8, ey, color); }
    g.fillRect(9, 6, 4, 4);
  }
}

const bricks = new Map();
function brickArt(look, lit) {
  const key = look + (lit ? '+' : '-');
  if (bricks.has(key)) return bricks.get(key);
  // unlit: the frame a step darker, the glyph dim, so the pop reads
  const r = RAMP[look], k = lit ? 0 : 1;
  const [c, g] = makeCanvas(16, 16);
  g.fillStyle = INK; g.fillRect(0, 0, 16, 16);
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]]) g.clearRect(x, y, 1, 1);
  R(g, 1, 1, 14, 14, r + '.' + (2 - k));
  R(g, 1, 1, 14, 1, r + '.' + (3 - k)); R(g, 1, 1, 1, 13, r + '.' + (3 - k));
  R(g, 1, 14, 14, 1, r + '.0'); R(g, 14, 2, 1, 13, r + '.0');
  g.fillStyle = lit ? col(r + '.1') : '#0f1430';
  g.fillRect(3, 3, 10, 10);
  if (lit) R(g, 3, 3, 10, 1, r + '.2');
  glyph(g, GLYPH_OF[look], lit ? col('white.2') : col(r + '.1'));
  bricks.set(key, c);
  return c;
}

// the five lit bricks for the skills card's group headings, by fact id:
// fresh 16 × 16 canvases (game px) the page may move into its markup;
// scale them up whole with image-rendering: pixelated
export function tierIcons() {
  const icon = (look) => { const [c, g] = makeCanvas(16, 16); g.drawImage(brickArt(look, true), 0, 0); return c; };
  return { 's-lang': icon('roots'), 's-data': icon('data'), 's-ml': icon('neural'), 's-web': icon('web'), 's-tools': icon('crown') };
}

// ─── layout (x from the core's left edge; y is the scene's) ──────────

const GROUND = 66;                  // the bluff top, where the trunk meets the soil
const FOOT = 88;                    // the root he lands on
// top to bottom; side is the edge its brick sits on
const BANDS = [
  { look: 'crown', fact: 's-tools', y0: 8, y1: 24, side: 1 },
  { look: 'web', fact: 's-web', y0: 24, y1: 38, side: -1 },
  { look: 'neural', fact: 's-ml', y0: 38, y1: 52, side: 1 },
  { look: 'data', fact: 's-data', y0: 52, y1: 66, side: -1 },
  { look: 'roots', fact: 's-lang', y0: 66, y1: 86, side: 1 },
];

// the trunk's half-width at y: slim up top, flaring into the ground
const half = (y) => (y < 24 ? 3 : y < 52 ? lerp(6, 8, (y - 24) / 28) : 8 + Math.pow(clamp((y - 52) / 14, 0, 1), 2) * 6);

// a tapered limb or root along a quadratic curve (tree.js limb)
function limb(g, [a, b, c], r0, r1, C) {
  const at = (s) => [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * b[0] + s * s * c[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * b[1] + s * s * c[1]];
  const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2) + 2;
  for (const pass of [0, 1, 2]) {
    for (let i = 0; i <= n; i++) {
      const s = i / n, [x, y] = at(s), r = lerp(r0, r1, s);
      if (pass === 0) disc(g, x, y, Math.round(r + 1), INK);
      else if (pass === 1) disc(g, x, y, Math.round(r), C.mid);
      else if (r > 2) disc(g, x - r * 0.35, y - r * 0.35, Math.max(1, Math.round(r * 0.35)), C.hi);
    }
  }
}

// a clump of leaves (tree.js blob)
function blob(g, x, y, r, P) {
  disc(g, x, y, r + 1, P.edge);
  disc(g, x, y, r, P.lo);
  disc(g, x - r * 0.25, y - r * 0.3, Math.max(1, Math.round(r * 0.72)), P.mid);
  disc(g, x - r * 0.45, y - r * 0.5, Math.max(1, Math.round(r * 0.32)), P.hi);
}

function cloud(g, cx, cy, w, seed) {
  const r = rng(60 + seed);
  const puffs = Array.from({ length: 4 }, (_, i) => [cx + (i / 3 - 0.5) * w + (r() - 0.5) * 3, cy - r() * 2, 3 + Math.round(r() * w * 0.14)]);
  for (const [x, y, rr] of puffs) disc(g, x, y + 1, rr + 1, '#3b3a6e');
  for (const [x, y, rr] of puffs) disc(g, x, y, rr, '#4a4882');
  for (const [x, y, rr] of puffs) disc(g, x - 1, y - 1, Math.max(1, rr - 2), '#5e5a94');
}

// code syntax pressed into the soil, as pixel marks (never glyph text)
const MARK = {
  '{': ['.xx', '.x.', 'x..', '.x.', '.xx'], '}': ['xx.', '.x.', '..x', '.x.', 'xx.'],
  '<': ['..x', '.x.', 'x..', '.x.', '..x'], '>': ['x..', '.x.', '..x', '.x.', 'x..'],
  '/': ['..x', '..x', '.x.', 'x..', 'x..'], ';': ['.', 'x', '.', 'x', 'x'], '=': ['...', 'xxx', '...', 'xxx', '...'],
  '(': ['.x', 'x.', 'x.', 'x.', '.x'], ')': ['x.', '.x', '.x', '.x', 'x.'], '[': ['xx', 'x.', 'x.', 'x.', 'xx'], ']': ['xx', '.x', '.x', '.x', 'xx'],
};
function marks(g, s, x, y, c, shade) {
  for (const ch of s) {
    if (ch === ' ') { x += 2; continue; }
    const m = MARK[ch];
    m.forEach((row, j) => [...row].forEach((v, i) => { if (v === 'x') { R(g, x + i, y + j + 1, 1, 1, shade); R(g, x + i, y + j, 1, 1, c); } }));
    x += m[0].length + 1;
  }
}

// ─── painting ─────────────────────────────────────────────────────────

function paintBack(w, h, X, TX) {
  const [c, g] = makeCanvas(w, h);
  sky(g, w, GROUND + 2, ['#1a1e4f', 'indigo.1', '#41407c', '#634c7e', '#7d5b7a']);
  // a few early stars, clouds around the crown
  const r = rng(3);
  for (let i = 0; i < 12; i++) { const x = Math.floor(r() * w), y = 3 + Math.floor(r() * 24); if (Math.abs(x - TX) > 40) R(g, x, y, 1, 1, r() < 0.4 ? '#c9c3e6' : '#7a7cb8'); }
  cloud(g, TX - 44, 12, 22, 0); cloud(g, TX + 40, 9, 20, 1); cloud(g, X(-20), 30, 24, 2); cloud(g, X(178), 26, 20, 3);

  // the soil: a cut-away of the bluff, a hollow under the trunk for the roots
  for (let y = GROUND; y < h; y++) R(g, 0, y, w, 1, y < GROUND + 6 ? SOIL.mid : SOIL.base);
  const n = noise1(7);
  for (let k = 0; k < 3; k++) for (let x = 0; x < w; x++) R(g, x, Math.round(GROUND + 12 + k * 9 + n(x * 0.05 + k * 9) * 3), 1, 1, k % 2 ? '#352216' : '#45301f');
  const hx0 = TX - 34, hx1 = TX + 22;
  for (let y = GROUND + 5; y < h; y++) {
    const k = (y - GROUND - 5) / (h - GROUND - 5);
    const a = Math.round(lerp(TX - 14, hx0, Math.sqrt(k))), b = Math.round(lerp(TX + 10, hx1, Math.sqrt(k)));
    R(g, a - 1, y, b - a + 2, 1, SOIL.lo); R(g, a, y, b - a, 1, SOIL.cave);
  }
  // the grass lip of the bluff top, at dusk
  for (let x = 0; x < w; x++) {
    R(g, x, GROUND - 1, 1, 3, '#2c5a35'); R(g, x, GROUND - 1, 1, 1, '#3f7a45');
    if ((x * 7) % 5 === 0) R(g, x, GROUND - 2, 1, 1, '#2c5a35');
    R(g, x, GROUND + 2, 1, 1, SOIL.lo);
  }

  // the canopy: two masses either side of the trunk
  const lr = rng(12);
  for (let i = 0; i < 7; i++) blob(g, lerp(X(34), TX - 14, i / 6) + (lr() - 0.5) * 4, 40 + (lr() - 0.5) * 8, 7 + Math.floor(lr() * 4), LEAF);
  for (let i = 0; i < 6; i++) blob(g, lerp(TX + 14, X(128), i / 5) + (lr() - 0.5) * 4, 38 + (lr() - 0.5) * 8, 6 + Math.floor(lr() * 4), LEAF);
  for (let i = 0; i < 4; i++) blob(g, TX - 30 + i * 20, 27 + (lr() - 0.5) * 4, 6 + Math.floor(lr() * 3), LEAF);
  // two boughs out to the web band
  limb(g, [[TX - 4, 34], [TX - 20, 30], [X(46), 31]], 3, 2, BARK);
  limb(g, [[TX + 4, 32], [TX + 18, 29], [X(116), 30]], 3, 2, BARK);

  // the trunk, flaring at the ground, and the taproot down into the hollow
  limb(g, [[TX + 1, GROUND + 2], [TX + 2, 80], [TX - 2, h + 2]], 4, 3, ROOT);
  limb(g, [[TX - 8, GROUND + 2], [TX - 24, 72], [X(40), 82]], 4, 1, ROOT);
  limb(g, [[TX + 8, GROUND + 2], [TX + 22, 70], [X(132), 80]], 4, 1, ROOT);
  limb(g, [[TX - 6, GROUND + 4], [TX - 14, 84], [TX - 32, 92]], 3, 1, ROOT);
  for (let y = 22; y < GROUND + 3; y++) {
    const hw = Math.round(half(y)), x0 = TX - hw, x1 = TX + hw;
    R(g, x0 - 1, y, x1 - x0 + 2, 1, 'ink.0');
    g.fillStyle = BARK.mid; g.fillRect(x0, y, x1 - x0, 1);
    g.fillStyle = BARK.hi; g.fillRect(x0, y, 2, 1);
    g.fillStyle = BARK.lo; g.fillRect(x1 - 4, y, 3, 1);
    g.fillStyle = BARK.dk; g.fillRect(x1 - 1, y, 1, 1);
    for (const [f, s] of [[-0.45, 1], [0.1, 2], [0.5, 3]]) { const gx = Math.round(TX + f * hw + (n(y * 0.08 + s * 30) - 0.5) * 2); g.fillStyle = BARK.lo; g.fillRect(gx, y, 1, 1); }
  }
  // the root he lands on, across the hollow
  limb(g, [[TX - 26, FOOT + 2], [TX - 12, FOOT + 1], [TX + 4, FOOT + 3]], 2, 2, ROOT);
  return c;
}

// each band's art, unlit and lit, as its own layer (drawn once per width)
function paintBand(w, h, X, TX, band, lit) {
  const [c, g] = makeCanvas(w, h);
  const L = (k) => col(RAMP[band.look] + '.' + k);
  const thick = (x0, y0, x1, y1, cc) => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, -1], [1, 1], [2, 0]]) line(g, x0 + dx, y0 + dy, x1 + dx, y1 + dy, 'ink.0');
    line(g, x0, y0, x1, y1, cc); line(g, x0 + 1, y0, x1 + 1, y1, cc);
  };
  const commit = (x, y, cc) => { disc(g, x, y, 3, 'ink.0'); disc(g, x, y, 2, cc); };
  switch (band.look) {
    case 'crown': {
      // the leader becomes the main line; a branch each side forks and merges
      const m = lit ? 'gold.3' : 'gold.1', a = lit ? 'cyan.3' : 'cyan.1', b = lit ? 'magenta.3' : 'magenta.1';
      thick(TX - 16, 18, TX - 16, 11, a); thick(TX, 21, TX - 16, 18, a); thick(TX - 16, 11, TX, 8, a);
      thick(TX + 16, 17, TX + 16, 12, b); thick(TX, 20, TX + 16, 17, b); thick(TX + 16, 12, TX, 10, b);
      thick(TX, 24, TX, 5, m);
      for (const y of [7, 14, 21]) commit(TX + 1, y, lit ? (y === 7 ? 'white.2' : 'gold.2') : 'gold.0');
      commit(TX - 15, 14, lit ? 'cyan.2' : 'cyan.0'); commit(TX + 17, 14, lit ? 'magenta.2' : 'magenta.0');
      break;
    }
    case 'web': {
      // a browser window and a server, a wire slung between them
      const cl = { x: X(30), y: 26, w: 16, h: 11 }, sv = { x: X(114), y: 24, w: 12, h: 14 };
      const wa = cl.x + cl.w - 3, wb = sv.x + 3, wy = 27;
      for (let x = wa; x <= wb; x++) {
        const u = (x - wa) / (wb - wa), y = Math.round(wy + 3 * (1 - (2 * u - 1) * (2 * u - 1)));
        R(g, x, y - 1, 1, 3, 'ink.0'); g.fillStyle = lit ? L(3) : col('slate.2'); g.fillRect(x, y, 1, 1);
      }
      R(g, cl.x - 1, cl.y - 1, cl.w + 2, cl.h + 2, 'ink.0');
      R(g, cl.x, cl.y, cl.w, cl.h, '#0f1430'); R(g, cl.x, cl.y, cl.w, 3, 'indigo.2');
      [['red.2', 0], ['gold.2', 3], ['green.2', 6]].forEach(([cc, dx]) => R(g, cl.x + 1 + dx, cl.y + 1, 2, 1, cc));
      for (let i = 0; i < 3; i++) { g.fillStyle = lit ? col(i === 0 ? 'green.3' : 'slate.3') : col('slate.1'); g.fillRect(cl.x + 2, cl.y + 5 + i * 2, cl.w - 4 - (i % 2) * 5, 1); }
      R(g, sv.x - 1, sv.y - 1, sv.w + 2, sv.h + 2, 'ink.0'); R(g, sv.x, sv.y, sv.w, sv.h, 'steel.2');
      for (let r = 0; r < 3; r++) {
        R(g, sv.x + 1, sv.y + 1 + r * 4, sv.w - 2, 3, 'steel.1');
        R(g, sv.x + sv.w - 4, sv.y + 2 + r * 4, 2, 1, lit ? 'green.3' : 'slate.1');
        R(g, sv.x + 2, sv.y + 2 + r * 4, 4, 1, 'steel.3');
      }
      break;
    }
    case 'neural': {
      // a small network among the leaves, left of the trunk: 4 inputs, 3 hidden, 2 out
      const ins = [32, 42, 52, 62].map((x) => [X(x), 51]);
      const hid = [37, 47, 57].map((x) => [X(x), 45]);
      const out = [42, 52].map((x) => [X(x), 39]);
      for (const [p, q] of [...ins.flatMap((i) => hid.map((hh) => [i, hh])), ...hid.flatMap((hh) => out.map((o) => [hh, o]))]) line(g, p[0], p[1], q[0], q[1], lit ? 'magenta.2' : '#4a2a4a');
      const node = (p, big) => {
        R(g, p[0] - 1, p[1] - 2, 3, 5, 'ink.0'); R(g, p[0] - 2, p[1] - 1, 5, 3, 'ink.0');
        R(g, p[0] - 1, p[1] - 1, 3, 3, lit ? (big ? 'magenta.3' : 'magenta.2') : 'magenta.0');
        if (lit) R(g, p[0] - 1, p[1] - 1, 1, 1, 'white.2');
      };
      ins.forEach((p) => node(p)); hid.forEach((p) => node(p)); out.forEach((p) => node(p, true));
      break;
    }
    case 'data': {
      // sap streams up the left of the trunk, a scatter and its fit cut on the right
      for (const lx of [TX - 6, TX - 3]) for (let y = 54; y < GROUND; y += 4) R(g, lx, y, 1, 2, lit ? (y % 8 ? 'cyan.3' : 'cyan.2') : 'wood.0');
      const cut = lit ? '#f0c888' : '#8a5a34', deep = BARK.dk;
      R(g, TX + 1, 54, 1, 10, cut); R(g, TX + 1, 63, 9, 1, cut);
      const pts = [[3, 7], [4, 5], [5, 6], [6, 4], [7, 3], [8, 2], [5, 4], [8, 1]];
      for (const [px, py] of pts) { g.fillStyle = deep; g.fillRect(TX + 1 + px, 54 + py + 1, 1, 1); g.fillStyle = col(cut); g.fillRect(TX + 1 + px, 54 + py, 1, 1); }
      if (lit) line(g, TX + 2, 63, TX + 10, 53, 'cyan.3');
      // the histogram on the flare
      [3, 5, 6, 4, 2].forEach((hh, i) => { R(g, TX + 4 + i * 2, GROUND - hh, 1, hh, cut); });
      break;
    }
    case 'roots': {
      // the roots glow; syntax pressed into the soil either side
      const c1 = lit ? 'orange.2' : '#5a3a24', sh = lit ? 'orange.0' : '#26170e';
      [['{ }', X(8), 72], ['</>', X(26), 84], [';', X(40), 92], ['=>', X(104), 78], ['[ ]', X(116), 90], ['//', X(10), 92], ['( )', X(146), 74]]
        .forEach(([s, x, y]) => marks(g, s, x, y, c1, sh));
      if (lit) for (const [x, y] of [[TX - 20, 72], [TX + 18, 71], [TX - 28, 89], [TX + 2, 84], [X(44), 81], [X(128), 79]]) { R(g, x, y, 2, 1, 'orange.3'); R(g, x, y + 1, 1, 1, 'orange.2'); }
      break;
    }
  }
  return c;
}

// ─── he climbs down ───────────────────────────────────────────────────

// where he is through the act: down the trunk from the top commit to the
// roots (climbing), then a little crouch as he lets go onto the root
function climb(f, b) {
  const u = clamp(f.act / 0.9, 0, 1);
  const y = lerp(0, FOOT, u);
  const x = b.HX + (y > GROUND ? Math.round((y - GROUND) / (FOOT - GROUND) * 2) : 0);
  return { x, y, u };
}
function bandLit(b, f, i) {
  if (f.phase === 'before' || f.phase === 'in') return 0;
  if (f.phase !== 'act') return 1;
  const mid = climb(f, b).y - 12, band = BANDS[i];
  return clamp((mid - (band.y0 + band.y1) / 2) / 10, 0, 1);   // 0 not yet, 0–1 popping, 1 lit
}

// the move to Contact (T9) ─────────────────────────────────────────────

const PLANK = { hi: '#a37850', mid: '#7a5536', lo: '#523722' };

function t9At(b, s, dir = 1, still = false) {
  s = clamp(s, 0, 1);
  const { hx, deck, from, to, face } = b;
  if (s < 0.04) {                                      // a step across onto the ladder
    const u = s / 0.04;
    return { x: lerp(from[0], hx, u), y: lerp(0, 4, u), pose: 'climb', frame: 0, facing: face };
  }
  if (s < 0.85) {                                      // down the root ladder
    const y = lerp(4, deck, (s - 0.04) / 0.81);
    return { x: hx, y, pose: 'climb', frame: Math.floor(y / 6) % 2, facing: face };
  }
  const u = (s - 0.85) / 0.15;                         // off the ladder, along the planks
  if (u < 0.12) return { x: hx, y: deck, pose: still ? 'idle' : 'crouch', frame: 0, facing: Math.sign(to[0] - hx || 1) * dir };
  const v = (u - 0.12) / 0.88, x = lerp(hx, to[0], v);
  const y = v > 0.85 ? lerp(deck, to[1], (v - 0.85) / 0.15) : deck;
  if (s >= 1) return { x: to[0], y: to[1], pose: 'idle', frame: 0, facing: 1 };
  return { x, y, pose: still ? 'idle' : 'run', frame: Math.floor(Math.abs(x - hx) / 5) % 4, facing: Math.sign(to[0] - hx || 1) * dir };
}

const T9 = {
  build({ w, h, from = [w / 2, 0], to = [w / 2, h], side = 0, lane = 0 }) {
    // the bluff is on the free side; the ladder hangs on its face, inside the lane
    const free = side ? -side : -1;
    const lx = Math.round(from[0] + (side ? free * Math.min(6, Math.max(0, lane - 8)) : 0));
    const face = free;                                 // he faces the rock
    const hx = lx - face * 3;
    const deck = h - 4;
    const [back, g] = makeCanvas(w, h);
    // the bluff face: low contrast rock with strata and a few ledges
    const n = noise1(17), edge = (y) => lx + free * (6 + Math.round(n(y * 0.06) * 4));
    for (let y = 0; y < deck; y++) {
      const e = edge(y), a = free < 0 ? 0 : e, z = free < 0 ? e : w;
      R(g, a, y, z - a, 1, '#151c3f');
      R(g, e - (free < 0 ? 1 : 0), y, 1, 1, '#1d2550');
    }
    // cracks and strata that wander, so it reads as rock, not courses
    const cr = rng(31);
    for (let y = 14; y < deck - 8; y += 16 + Math.floor(cr() * 14)) {
      const e = edge(y), len = 8 + Math.floor(cr() * 14);
      for (let i = 0; i < len; i++) {
        const x = e - free * (2 + i), yy = y + Math.round(Math.sin(i * 0.5 + y) * 1.5);
        if (x >= 0 && x < w) R(g, x, yy, 1, 1, i % 5 === 4 ? '#1d2550' : '#10163a');
      }
    }
    for (let y = 30; y < deck - 20; y += 47) {
      const e = edge(y);
      R(g, e - (free < 0 ? 9 : -1), y, 9, 2, '#1d2550');
      R(g, e - (free < 0 ? 8 : -2), y - 1, 3, 1, '#24402f'); R(g, e - (free < 0 ? 4 : -5), y - 2, 1, 2, '#24402f');
    }
    // far down, the sea at the bluff's foot
    const sea = Math.max(0, deck - 40);
    for (let y = sea; y < h; y++) R(g, 0, y, free < 0 ? lx - 8 : w, 1, y < sea + 2 ? '#1b2a5c' : '#121c44');
    if (free > 0) R(g, 0, sea, lx + 8, h - sea, '#0e1433');
    // the ladder (drawn over the path): two twisted root strands from the
    // tree's taproot, knotted rungs, rootlets off them
    const [front, fg] = makeCanvas(w, h);
    limb(fg, [[from[0] + 8, -4], [from[0] + 6, 6], [lx + 3, 14]], 3, 1, ROOT);
    limb(fg, [[from[0] + 6, -4], [lx, 4], [lx - 3, 14]], 2, 1, ROOT);
    const rng9 = rng(9);
    for (let y = 8; y < deck + 1; y++) {
      for (const [rx, ph] of [[lx - 3, 0], [lx + 3, 3]]) {
        R(fg, rx - 1, y, 3, 1, 'ink.0');
        fg.fillStyle = (y + ph) % 6 < 3 ? ROOT.mid : ROOT.lo; fg.fillRect(rx, y, 1, 1);
      }
    }
    for (let y = 11; y < deck; y += 6) {
      R(fg, lx - 3, y - 1, 7, 3, 'ink.0');
      fg.fillStyle = ROOT.mid; fg.fillRect(lx - 2, y, 5, 1);
      fg.fillStyle = ROOT.hi; fg.fillRect(lx - 3, y, 1, 1); fg.fillRect(lx + 3, y, 1, 1);
    }
    for (let y = 15; y < deck - 6; y += 13 + Math.floor(rng9() * 9)) {
      const len = 3 + Math.floor(rng9() * 4), x = free < 0 ? lx - 4 : lx + 4;
      for (let i = 0; i < len; i++) R(fg, x + free * i, y + i, 1, 1, ROOT.lo);
    }
    // the dock planks at the foot, out towards the harbour
    const da = Math.min(lx - 10, to[0] - 12), dz = Math.max(lx + 10, to[0] + 12);
    R(fg, da - 1, deck - 1, dz - da + 2, h - deck + 1, 'ink.0');
    R(fg, da, deck, dz - da, h - deck, PLANK.mid);
    R(fg, da, deck, dz - da, 1, PLANK.hi);
    for (let x = da + 5; x < dz; x += 7) R(fg, x, deck + 1, 1, h - deck - 1, PLANK.lo);
    const b = { w, h, back, front, lx, hx, deck, from, to, face };
    const pts = [from, [hx, 4], [hx, deck], [to[0], deck], to];
    b.pts = pts;
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    b.seg = seg;
    return b;
  },

  draw(ctx, g, b) {
    ctx.drawImage(b.back, 0, 0);
    // the path: cream up to where he's got to
    let done = Infinity;
    if (!g.reduced) {
      const p = t9At(b, g.s);
      done = 0;
      for (let i = 0; i < b.seg.length; i++) {
        const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1];
        const along = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? (p.x - x0) / (x1 - x0 || 1) : (p.y - y0) / (y1 - y0 || 1);
        if (along >= 1) { done += b.seg[i]; continue; }
        done += b.seg[i] * clamp(along, 0, 1);
        break;
      }
      if (g.s <= 0) done = -1;
    }
    drawPath(ctx, b.pts, { done });
    ctx.drawImage(b.front, 0, 0);
  },

  hero(g, b) {
    const p = t9At(b, g.s, g.dir, g.still);
    return { pose: p.pose, frame: p.frame, x: p.x, y: p.y, facing: p.facing };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'skills',
  facts: ['s-lang', 's-data', 's-ml', 's-web', 's-tools'],
  split: [0, 0.55, 0.85],          // no walk in: he climbs from the top commit
  key: 0.7,
  idle: true,

  build({ w, h }) {
    const x0 = coreX(w), X = (v) => x0 + v, c = Math.round(w / 2);
    const TX = c + 10, HX = c - 2;
    return {
      back: paintBack(w, h, X, TX), X, TX, HX,
      bands: BANDS.map((bd) => ({ off: paintBand(w, h, X, TX, bd, false), on: paintBand(w, h, X, TX, bd, true), bx: bd.side > 0 ? X(134) : X(10), by: Math.round((bd.y0 + bd.y1) / 2) - 8 })),
      line: [[HX, 0], [HX, GROUND], [c, FOOT], [c, h]],
      route: { enter: [HX, 0], act: [c, FOOT], exit: [c, h] },
    };
  },

  draw(ctx, f, b) {
    ctx.drawImage(b.back, 0, 0);
    const tick = f.t ? Math.floor(f.t / 125) : 0;
    const lit = BANDS.map((_, i) => bandLit(b, f, i));
    b.bands.forEach((L, i) => ctx.drawImage(lit[i] > 0 ? L.on : L.off, 0, 0));
    if (tick) idle(ctx, b, tick);
    // the bricks: each pops up as he passes, a few sparks fly off it
    b.bands.forEach((L, i) => {
      const k = lit[i], pop = k > 0 && k < 1 ? -Math.round(Math.sin(k * Math.PI) * 3) : 0;
      ctx.drawImage(brickArt(BANDS[i].look, k > 0), L.bx, L.by + pop);
      if (k > 0 && k < 1) {
        const r = Math.round(3 + ease.outCubic(k) * 6), cc = col(RAMP[BANDS[i].look] + '.3');
        for (const [dx, dy] of [[-1, -1], [1, -1], [0, -1.4], [-1.3, 0.2], [1.3, 0.2]]) { ctx.fillStyle = cc; ctx.fillRect(Math.round(L.bx + 8 + dx * r), Math.round(L.by + 8 + pop + dy * r), 1, 1); }
      }
    });
    // the path down the trunk: cream behind him
    const down = { act: climb(f, b).y, hold: FOOT + 1, out: FOOT + 1 + (b.h - FOOT) * f.walk }[f.phase];
    const done = f.reduced || f.phase === 'after' ? Infinity : down != null ? down : -1;
    drawPath(ctx, b.line, { done });
    f.drawHero();
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    const { x, y, u } = climb(f, b);
    if (f.phase === 'hold') return { pose: f.t && Math.floor(f.t / 125) % 40 === 7 ? 'blink' : 'idle', frame: 0, x: b.HX + 2, y: FOOT, facing: 1 };
    if (u >= 1) return { pose: f.act < 0.96 ? 'crouch' : 'idle', frame: 0, x, y, facing: 1 };
    return { pose: 'climb', frame: Math.floor(y / 6) % 2, x, y, facing: 1 };
  },

  transit: T9,
};

// the hold's idle loop (≤ 8 fps): packets on the wire, sap rising,
// a signal through the net, light running down the roots
function idle(ctx, b, tick) {
  const { X, TX } = b;
  const wa = X(43), wb = X(117);
  for (let i = 0; i < 2; i++) {
    const k = ((tick * 3 + i * 37) % 74) / 74, x = Math.round(lerp(wa, wb, i ? 1 - k : k));
    const u = (x - wa) / (wb - wa), y = Math.round(27 + 3 * (1 - (2 * u - 1) * (2 * u - 1)));
    R(ctx, x - 2, y - 2, 5, 4, 'ink.0'); R(ctx, x - 1, y - 1, 3, 2, i ? 'green.3' : 'cyan.3');
  }
  for (const lx of [TX - 6, TX - 3]) { const y = GROUND - 2 - ((tick * 2 + lx) % 12); R(ctx, lx, y, 1, 2, 'white.2'); }
  const sig = [[X(32), 51], [X(37), 45], [X(42), 39], [X(62), 51], [X(57), 45], [X(52), 39]];
  const s = sig[tick % sig.length];
  R(ctx, s[0] - 1, s[1] - 1, 3, 3, 'ink.0'); R(ctx, s[0], s[1], 1, 1, 'white.2');
  const ry = 70 + (tick % 14);
  R(ctx, TX - 1, ry, 2, 2, 'orange.3');
}

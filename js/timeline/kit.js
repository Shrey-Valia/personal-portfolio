// What a stop draws with. Stops import from here and from the small art
// helpers (palette, sprite, draw, util), never from the game.
//
//   pose({ head, torso, legs, patch, hand })   a custom hero frame
//   STD                                         the shared pose pack
//   handAt(pose, frame, facing, local)          where his front hand is
//   drawPath(ctx, pts, { done })                the dotted spine, cream behind him
//   sky(ctx, w, h, stops)                       a flat banded sky from the page colour
//   fadeEdges(ctx, w, h)                        the scene's edges stepping into the page
//   ledge(ctx, x, y, w, material)               era hardware: a ledge, rail or plank
//
// All coordinates are game pixels; one game pixel is drawn as a square of
// whole device pixels by the engine. Nothing here draws text.

import { col } from '../art/palette.js';
import { stripedSky } from '../art/draw.js';
import { drawFrame } from '../art/sprite.js';
import { compose, buildStd } from './poses.js';

export const SCENE_H = 100;          // every scene is this tall
export const CORE_W = 160;           // what matters sits in the centred 160 px
export const MIN_W = 160, MAX_W = 240;
export const FLOOR = 82;             // the default ground line (feet y) in a scene
export const PAGE = '#0e1433';       // the page colour, --night

export const coreX = (w) => Math.round((w - CORE_W) / 2);

// ─── the hero ─────────────────────────────────────────────────────────

export const pose = compose;
export const STD = buildStd();

// a frame by name: the stop's own poses first, then STD; frame wraps
export function frameOf(name, frame = 0, local = null) {
  const list = (local && local[name]) || STD[name] || STD.idle;
  const arr = Array.isArray(list) ? list : [list];
  const i = Math.floor(frame) || 0;
  return arr[((i % arr.length) + arr.length) % arr.length];
}

// his front hand, as [x, y] from the point between his feet
export function handAt(name, frame = 0, facing = 1, local = null) {
  const [dx, dy] = frameOf(name, frame, local).hand || [2, -9];
  return facing < 0 ? [-dx - 1, dy] : [dx, dy];
}

// (x, y) is the point between his feet; facing 1 is right
export function drawHero(ctx, fr, x, y, facing = 1) {
  drawFrame(ctx, fr, x - 5, y - 20, facing < 0, 10);
}

// ─── the path ─────────────────────────────────────────────────────────

const DOT = col('#fff3c4'), AHEAD = col('#4f5f86'), INK = col('ink.0');

// the island map's road, turned vertical: a 2×2 dot every 6 px along the
// polyline with an ink outline. Dots up to `done` px along it are cream
// (passed), the rest are the map's "locked" blue. Returns its length.
export function drawPath(ctx, pts, { done = Infinity, pitch = 6, start = 0 } = {}) {
  let d = 0;
  const dots = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    for (let s = (pitch - ((d + start) % pitch)) % pitch; s < L; s += pitch) {
      const k = s / L;
      dots.push([Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), d + s <= done]);
    }
    d += L;
  }
  ctx.fillStyle = INK;
  for (const [x, y] of dots) ctx.fillRect(x - 2, y - 2, 4, 4);
  for (const [x, y, on] of dots) { ctx.fillStyle = on ? DOT : AHEAD; ctx.fillRect(x - 1, y - 1, 2, 2); }
  return d;
}

export function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

// ─── backdrops ────────────────────────────────────────────────────────

// a vertical gradient that starts at the page colour, one flat colour per row
export function sky(ctx, w, h, stops = ['indigo.0']) {
  stripedSky(ctx, w, h, [PAGE, ...stops]);
}

// the outer edge steps into the page colour in flat bands (no dithering),
// so the scene reads as the path widening rather than a boxed picture
export function fadeEdges(ctx, w, h, { size = 12, sides = 'tblr', color = PAGE } = {}) {
  const c = col(color), n = parseInt(c.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const bands = 4, bw = Math.max(1, Math.round(size / bands));
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = `rgba(${rgb},${(0.85 * (1 - i / bands)).toFixed(3)})`;
    const o = i * bw;
    if (sides.includes('t')) ctx.fillRect(o, o, w - o * 2, bw);
    if (sides.includes('b')) ctx.fillRect(o, h - o - bw, w - o * 2, bw);
    if (sides.includes('l')) ctx.fillRect(o, o + bw, bw, h - (o + bw) * 2);
    if (sides.includes('r')) ctx.fillRect(w - o - bw, o + bw, bw, h - (o + bw) * 2);
  }
}

// era hardware: [top highlight, body, underside]
export const MATERIAL = {
  steel: ['steel.4', 'steel.3', 'steel.1'],
  brick: ['#e3e6ee', '#a8442e', '#7a2e1e'],          // snow-capped brick
  asphalt: ['slate.3', 'slate.1', 'slate.0'],
  concrete: ['white.1', '#9a968e', '#6b6760'],
  cable: ['slate.2', 'ink.0', 'ink.0'],
  rail: ['green.3', 'indigo.1', 'indigo.0'],          // navy data rail, phosphor edge
  bark: ['wood.3', 'wood.2', 'wood.0'],
  plank: ['wood.3', 'wood.1', 'wood.0'],
};

// a 4 px ledge with an ink outline, its top surface at y
export function ledge(ctx, x, y, w, material = 'steel') {
  const [hi, body, lo] = (MATERIAL[material] || MATERIAL.steel).map(col);
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = body; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = hi; ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = lo; ctx.fillRect(x, y + 3, w, 1);
}

// how far along the scene's route the path is "passed" (for drawPath's done),
// from f: nothing before, all of it after, and his progress in between
export function routeDone(route, f) {
  const inPts = [route.enter, ...(route.via || []), route.act];
  const outPts = [route.act, ...(route.leave || []), route.exit];
  const a = pathLength(inPts), b = pathLength(outPts);
  if (f.reduced || f.phase === 'after') return Infinity;
  if (f.phase === 'before') return -1;
  if (f.phase === 'in') return a * f.walk;
  if (f.phase === 'out') return a + b * f.walk;
  return a;
}
export const routePoints = (route) => [route.enter, ...(route.via || []), route.act, ...(route.leave || []), route.exit];

// The path between stops, and how Shrey travels it. A segment runs from
// the bottom of one scene box (a) to the top of the next (b), inside the
// lane beside the card; amp is how far it may swing either side of the
// lane's centre. Everything is in art pixels in document space.
//
// A move is { shape(seg) → points, at(seg, s, how) → hero, draw(ctx, seg) }:
// shape is computed once per layout, at() places him at s (0 at a, 1 at b;
// s is linear in the reading line's height), draw() paints the path.
// Add one with registerMove(); a stop picks the move to the next stop
// with `leave`.

import { col } from '../art/palette.js';
import { clamp, lerp } from '../engine/util.js';

export const MOVES = {};

export function registerMove(name, def) {
  if (MOVES[name]) console.error(`[timeline] move "${name}" is registered twice; rename one.`);
  MOVES[name] = def;
}

const INK = col('ink.0');
const CREAM = col('#fff3c4');

// the point on a top-to-bottom polyline at height y, and how far along it is
function atY(pts, y) {
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (y <= y1 || i === pts.length - 1) {
      const k = y1 > y0 ? clamp((y - y0) / (y1 - y0), 0, 1) : 1;
      return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), dx: x1 - x0, dist: dist + len * k };
    }
    dist += len;
  }
  return { x: pts[0][0], y: pts[0][1], dx: 0, dist: 0 };
}

// back and forth across the lane, one turn about every `rise` px of height
function switchbacks(seg, rise) {
  const [ax, ay] = seg.a, [bx, by] = seg.b;
  const turns = Math.max(1, Math.round((by - ay) / rise));
  const pts = [[ax, ay]];
  for (let k = 1; k <= turns; k++) {
    const t = k / (turns + 1);
    pts.push([lerp(ax, bx, t) + seg.amp * (k % 2 ? seg.side : -seg.side), lerp(ay, by, t)]);
  }
  pts.push([bx, by]);
  return pts;
}

// a pen stroke along a polyline: a size×size square at every step
function stroke(ctx, pts, size, color, every = 1, phase = 0) {
  ctx.fillStyle = color;
  const o = size / 2;
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let j = 0; j < n; j++, d++) {
      if ((d + phase) % every) continue;
      ctx.fillRect(Math.round(x0 + ((x1 - x0) * j) / n - o), Math.round(y0 + ((y1 - y0) * j) / n - o), size, size);
    }
  }
}

const face = (dx, how) => (dx > 0.01 ? 1 : dx < -0.01 ? -1 : 1) * how.dir;
const runPose = (dist, how) => (how.moving ? 'run.' + Math.floor(dist / 5) : 'idle');

// ─── walk: switchback trail, the map's road ───────────────────────────
registerMove('walk', {
  shape: (seg) => switchbacks(seg, 44),
  at(seg, s, how) {
    const q = atY(seg.pts, lerp(seg.a[1], seg.b[1], s));
    return { x: q.x, y: q.y, pose: runPose(q.dist, how), facing: face(q.dx, how) };
  },
  draw(ctx, seg) {
    stroke(ctx, seg.pts, 4, INK);
    stroke(ctx, seg.pts, 2, CREAM, 6);
  },
});

// ─── slide: one long chute across the lane ───────────────────────────
registerMove('slide', {
  shape: (seg) => switchbacks(seg, 140),
  at(seg, s, how) {
    const q = atY(seg.pts, lerp(seg.a[1], seg.b[1], s));
    return { x: q.x, y: q.y, pose: s > 0.03 && s < 0.97 ? 'slide' : 'idle', facing: face(q.dx, how) };
  },
  draw(ctx, seg) {
    stroke(ctx, seg.pts, 5, INK);
    stroke(ctx, seg.pts, 3, col('teal.1'));
    stroke(ctx, seg.pts.map(([x, y]) => [x, y - 1]), 1, col('teal.3'));
  },
});

// ─── hop: ledge to ledge down the lane ───────────────────────────────
function ledges(seg) {
  const [ax, ay] = seg.a, [bx, by] = seg.b;
  const n = Math.max(2, Math.round((by - ay) / 40));
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const off = k === 0 || k === n ? 0 : seg.amp * 0.8 * (k % 2 ? seg.side : -seg.side);
    pts.push([lerp(ax, bx, t) + off, lerp(ay, by, t)]);
  }
  return pts;
}
registerMove('hop', {
  shape: ledges,
  at(seg, s, how) {
    const pts = seg.pts, n = pts.length - 1;
    const u = clamp(s, 0, 1) * n, k = Math.min(n - 1, Math.floor(u)), f = u - k;
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const stand = 0.35;
    if (f < stand) return { x: x0, y: y0, pose: f > stand - 0.1 && how.moving ? 'crouch' : 'idle', facing: face(x1 - x0, how) };
    const g = (f - stand) / (1 - stand);
    return { x: lerp(x0, x1, g), y: lerp(y0, y1, g) - Math.sin(g * Math.PI) * 12, pose: g < 0.45 ? 'jump' : 'fall', facing: face(x1 - x0, how) };
  },
  draw(ctx, seg) {
    const pts = seg.pts;
    for (let k = 1; k < pts.length - 1; k++) {
      const x = Math.round(pts[k][0]) - 7, y = Math.round(pts[k][1]);
      ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, 16, 6);
      ctx.fillStyle = col('slate.2'); ctx.fillRect(x, y, 14, 4);
      ctx.fillStyle = CREAM; ctx.fillRect(x, y, 14, 1);
      ctx.fillStyle = col('slate.1'); ctx.fillRect(x + 2, y + 3, 10, 1);
    }
  },
});

// ─── climb: down a ladder ────────────────────────────────────────────
registerMove('climb', {
  shape: (seg) => [seg.a, seg.b],
  at(seg, s) {
    const x = lerp(seg.a[0], seg.b[0], s), y = lerp(seg.a[1], seg.b[1], s);
    return { x, y, pose: s > 0.02 && s < 0.98 ? 'climb.' + Math.floor(y / 7) : 'idle', facing: 1 };
  },
  draw(ctx, seg) {
    const [ax, ay] = seg.a, [bx, by] = seg.b;
    for (let y = Math.ceil(ay); y < by; y++) {
      const x = Math.round(lerp(ax, bx, (y - ay) / Math.max(1, by - ay)));
      ctx.fillStyle = INK; ctx.fillRect(x - 8, y, 4, 1); ctx.fillRect(x + 4, y, 4, 1);
      ctx.fillStyle = col('wood.2'); ctx.fillRect(x - 7, y, 2, 1); ctx.fillRect(x + 5, y, 2, 1);
      if (y % 7 === 0) { ctx.fillStyle = INK; ctx.fillRect(x - 5, y - 1, 10, 3); ctx.fillStyle = col('wood.3'); ctx.fillRect(x - 5, y, 10, 1); }
    }
  },
});

// Axis-separated movement against the tile grid and moving platforms.
// X first, then Y. Max speed per axis stays under one tile per step, so a
// single pass can't tunnel.

import { TILE as T } from '../config.js';
import { SOLID, ONEWAY } from './tilemap.js';

const EPS = 0.01;

export function moveBody(b, map, platforms, opts) {
  const res = { headHit: null, wall: 0, landed: false };
  const wasGrounded = b.grounded;
  if (b.vx) moveX(b, map, b.vx, res);
  moveY(b, map, platforms, b.vy, res, opts || {});
  res.landed = b.grounded && !wasGrounded;
  return res;
}

function solidAt(map, c, r) { return (map.flag(c, r) & SOLID) !== 0; }

function moveX(b, map, dx, res) {
  b.x += dx;
  const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - EPS) / T);
  if (dx > 0) {
    const col = Math.floor((b.x + b.w - EPS) / T);
    for (let r = top; r <= bot; r++) {
      if (solidAt(map, col, r)) { b.x = col * T - b.w; b.vx = 0; res.wall = 1; return; }
    }
  } else {
    const col = Math.floor(b.x / T);
    for (let r = top; r <= bot; r++) {
      if (solidAt(map, col, r)) { b.x = (col + 1) * T; b.vx = 0; res.wall = -1; return; }
    }
  }
}

function moveY(b, map, platforms, dy, res, opts) {
  const prevBottom = b.y + b.h;
  b.y += dy;
  b.grounded = false;
  b.ground = null;
  const left = Math.floor(b.x / T), right = Math.floor((b.x + b.w - EPS) / T);

  if (dy > 0) {
    const bottom = b.y + b.h;
    const row = Math.floor((bottom - EPS) / T);
    const rowTop = row * T;
    for (let c = left; c <= right; c++) {
      const f = map.flag(c, row);
      if ((f & SOLID) || ((f & ONEWAY) && prevBottom <= rowTop + EPS && !b.dropping)) {
        b.y = rowTop - b.h;
        b.vy = 0;
        b.grounded = true;
        break;
      }
    }
    if (!b.grounded && platforms) {
      for (const p of platforms) {
        if (!p.active) continue;
        if (b.x + b.w <= p.x + 1 || b.x >= p.x + p.w - 1) continue;
        const topPrev = p.prevY !== undefined ? p.prevY : p.y;
        if (prevBottom <= Math.max(topPrev, p.y) + 0.5 && b.y + b.h >= p.y) {
          if (b.dropping && p.oneway !== false) continue;
          b.y = p.y - b.h;
          b.vy = 0;
          b.grounded = true;
          b.ground = p;
          break;
        }
      }
    }
  } else if (dy < 0) {
    const row = Math.floor(b.y / T);
    const blockers = [];
    for (let c = left; c <= right; c++) if (solidAt(map, c, row)) blockers.push(c);
    if (!blockers.length) return;

    // corner correction: clipping a block edge by a few pixels slides past it
    const corner = opts.corner || 0;
    if (blockers.length === 1 && corner) {
      const c = blockers[0];
      const fromLeft = b.x + b.w - c * T;          // overlap if we nudge left
      const fromRight = (c + 1) * T - b.x;         // overlap if we nudge right
      if (fromLeft <= corner && fromLeft <= fromRight && !solidAt(map, c - 1, row)) {
        b.x = c * T - b.w; return;
      }
      if (fromRight <= corner && !solidAt(map, c + 1, row)) {
        b.x = (c + 1) * T; return;
      }
    }

    b.y = (row + 1) * T;
    b.vy = 0;
    // the bumped block is the one nearest the hero's centre
    const cx = b.x + b.w / 2;
    let best = blockers[0];
    for (const c of blockers) if (Math.abs(c * T + T / 2 - cx) < Math.abs(best * T + T / 2 - cx)) best = c;
    res.headHit = { tx: best, ty: row };
  }
}

// move a body by a platform's delta without passing through solids.
// Returns true if a ceiling stopped it (the platform slides out from under).
export function carryBody(b, map, dx, dy) {
  if (dx) { const vx = b.vx; moveX(b, map, dx, { wall: 0 }); b.vx = vx; }
  if (dy < 0) {
    b.y += dy;
    const row = Math.floor(b.y / T);
    const left = Math.floor(b.x / T), right = Math.floor((b.x + b.w - EPS) / T);
    for (let c = left; c <= right; c++) {
      if (solidAt(map, c, row)) { b.y = (row + 1) * T; return true; }
    }
  } else if (dy > 0) {
    b.y += dy;
  }
  return false;
}

// is any tile under the (inset) box carrying this flag?
export function touchesFlag(b, map, flag, inset = 2) {
  const l = Math.floor((b.x + inset) / T), r = Math.floor((b.x + b.w - inset - EPS) / T);
  const t = Math.floor((b.y + inset) / T), d = Math.floor((b.y + b.h - inset - EPS) / T);
  for (let y = t; y <= d; y++) for (let x = l; x <= r; x++) if (map.flag(x, y) & flag) return true;
  return false;
}

// flags of the tiles directly under the feet
export function groundFlags(b, map) {
  const row = Math.floor((b.y + b.h + 1) / T);
  const l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - EPS) / T);
  let f = 0;
  for (let x = l; x <= r; x++) f |= map.flag(x, row);
  return f;
}

// ASCII rooms → a tile grid with collision flags, plus prerendered
// terrain chunks. One character per 16 px tile.

import { TILE } from '../config.js';
import { makeCanvas } from './util.js';

export const SOLID = 1, ONEWAY = 2, HAZARD = 4, CONVEY_L = 8, CONVEY_R = 16;

const TERRAIN = { '#': SOLID, '=': ONEWAY, '^': HAZARD, '<': SOLID | CONVEY_L, '>': SOLID | CONVEY_R };
const CHUNK = 256;

// rows may differ in length; short rows are padded with empty tiles
export function parseRows(rows) {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
}

// glue room segments side by side: each segment is an array of equal-height rows
export function joinSegments(segments) {
  const h = segments[0].length;
  const out = new Array(h).fill('');
  for (const seg of segments) {
    if (seg.length !== h) throw new Error('Segment height ' + seg.length + ' != ' + h);
    const w = Math.max(...seg.map((r) => r.length));
    for (let y = 0; y < h; y++) out[y] += seg[y].padEnd(w, '.');
  }
  return out;
}

export class TileMap {
  constructor(rows, kit) {
    rows = parseRows(rows);
    this.cols = rows[0].length;
    this.rows = rows.length;
    this.w = this.cols * TILE;
    this.h = this.rows * TILE;
    this.kit = kit;
    this.chars = rows.map((r) => r.split(''));
    this.flags = new Uint8Array(this.cols * this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const f = TERRAIN[this.chars[y][x]];
        if (f) this.flags[y * this.cols + x] = f;
      }
    }
    this.chunks = [];
    this.live = [];          // animated tiles drawn every frame
  }

  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows; }

  flag(tx, ty) {
    if (tx < 0 || tx >= this.cols) return SOLID;      // side walls
    if (ty < 0 || ty >= this.rows) return 0;          // open sky and pits
    return this.flags[ty * this.cols + tx];
  }

  setFlag(tx, ty, f) { if (this.inBounds(tx, ty)) this.flags[ty * this.cols + tx] = f; }

  char(tx, ty) { return this.inBounds(tx, ty) ? this.chars[ty][tx] : '.'; }

  isTerrain(tx, ty) {
    if (tx < 0 || tx >= this.cols) return true;
    if (ty >= this.rows) return this.isTerrain(tx, this.rows - 1);   // ground continues below
    if (ty < 0) return false;
    const c = this.chars[ty][tx];
    return c === '#';
  }

  // draw static terrain into 256 px wide chunk canvases once per room load
  prerender() {
    this.chunks = [];
    this.live = [];
    const n = Math.ceil(this.w / CHUNK);
    for (let i = 0; i < n; i++) {
      const [c, ctx] = makeCanvas(CHUNK, this.h);
      const x0 = (i * CHUNK) / TILE, x1 = Math.min(this.cols, x0 + CHUNK / TILE);
      for (let ty = 0; ty < this.rows; ty++) {
        for (let tx = x0; tx < x1; tx++) {
          const ch = this.chars[ty][tx];
          const px = (tx - x0) * TILE, py = ty * TILE;
          if (ch === '#') {
            const mask =
              (this.isTerrain(tx, ty - 1) ? 1 : 0) | (this.isTerrain(tx + 1, ty) ? 2 : 0) |
              (this.isTerrain(tx, ty + 1) ? 4 : 0) | (this.isTerrain(tx - 1, ty) ? 8 : 0);
            this.kit.terrain(ctx, px, py, mask, tx, ty, this);
          } else if (ch === '=') {
            this.kit.oneway(ctx, px, py, this.char(tx - 1, ty) === '=', this.char(tx + 1, ty) === '=', tx, ty);
          } else if (ch === '^' || ch === '<' || ch === '>') {
            this.live.push({ ch, tx, ty });
          }
        }
      }
      this.chunks.push(c);
    }
  }

  draw(ctx, camX, camY, W, H, t) {
    const first = Math.max(0, Math.floor(camX / CHUNK));
    const last = Math.min(this.chunks.length - 1, Math.floor((camX + W) / CHUNK));
    for (let i = first; i <= last; i++) ctx.drawImage(this.chunks[i], i * CHUNK - camX, -camY);
    for (const l of this.live) {
      const x = l.tx * TILE - camX;
      if (x < -TILE || x > W) continue;
      this.kit.animated(ctx, l.ch, x, l.ty * TILE - camY, t, l.tx, l.ty);
    }
  }
}

// Bugs. Two behaviours, reskinned per level: a walker that patrols and
// turns at ledges, and a hopper (the lab's "free radical", an unstable
// atom with a flailing electron) that springs toward you.

import { TILE } from '../config.js';
import { SOLID, ONEWAY } from '../engine/tilemap.js';
import { moveBody } from '../engine/physics.js';
import { col } from '../art/palette.js';
import { drawFrame } from '../art/sprite.js';
import { disc } from '../art/draw.js';
import { lerp } from '../engine/util.js';

export class Enemy {
  constructor(x, y, w, h) {
    this.spawnX = x; this.spawnY = y;
    this.w = w; this.h = h;
    this.reset();
  }
  reset() {
    this.x = this.prevX = this.spawnX;
    this.y = this.prevY = this.spawnY;
    this.vx = this.vy = 0;
    this.alive = true;
    this.flat = 0;
    this.awake = false;
    this.grounded = false;
  }
  stompable() { return this.alive && !this.flat; }
  stomp(level) {
    this.flat = 1;
    level.bugFixed(this.x + this.w / 2, this.y);
  }
  knock(level) { this.stomp(level); }        // bumped from below
  wake(level) {
    if (!this.awake && Math.abs(this.x - level.camX - level.W / 2) < level.W / 2 + 32) this.awake = true;
    return this.awake;
  }
}

export class Walker extends Enemy {
  constructor(tx, ty, skin) {
    super(tx * TILE + 1, (ty + 1) * TILE - 10, 14, 10);
    this.skin = skin;
    this.dir = -1;
  }
  reset() { super.reset(); this.dir = -1; this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 30) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.vx = this.dir * 0.45;
    this.vy = Math.min(this.vy + 0.4, 4);
    const map = level.map;
    // turn at ledges: look one pixel past the leading foot
    if (this.grounded) {
      const fx = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const below = map.flag(Math.floor(fx / TILE), Math.floor((this.y + this.h + 2) / TILE));
      if (!(below & (SOLID | ONEWAY))) this.dir = -this.dir;
    }
    const res = moveBody(this, map, level.platforms);
    if (res.wall) this.dir = -res.wall;
    if (this.y > map.h + 32) this.alive = false;
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = lerp(this.prevX, this.x, alpha) - cam.x, y = lerp(this.prevY, this.y, alpha) - cam.y;
    if (this.flat) {
      drawFrame(ctx, A.actors['bugFlat:' + this.skin][0], x - 1, y + 5, this.dir > 0, 14);
      return;
    }
    // the occasional glitch: a one-frame horizontal tear
    const glitch = ((this.t + this.spawnX) % 97) < 3 ? 2 : 0;
    drawFrame(ctx, A.actors['bug:' + this.skin][(this.t >> 3) & 1], x - 1 + glitch, y, this.dir > 0, 14);
  }
}

export class Hopper extends Enemy {
  constructor(tx, ty) {
    super(tx * TILE + 2, (ty + 1) * TILE - 12, 12, 12);
  }
  reset() { super.reset(); this.wait = 50; this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 24) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.vy = Math.min(this.vy + 0.3, 4);
    if (this.grounded) {
      this.vx = 0;
      if (--this.wait <= 0) {
        const hx = level.hero.x + level.hero.w / 2;
        this.vx = Math.sign(hx - (this.x + 6)) * 0.9;
        this.vy = -4.6;
        this.wait = 70 + ((this.spawnX * 7) % 30);
      }
    }
    const res = moveBody(this, level.map, level.platforms);
    if (res.wall) this.vx = -this.vx;
    if (this.y > level.map.h + 32) this.alive = false;
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    const cx = x + 6, cy = y + 6;
    if (this.flat) {
      ctx.fillStyle = col('magenta.1'); ctx.fillRect(x, y + 9, 12, 3);
      ctx.fillStyle = col('magenta.3'); ctx.fillRect(x + 2, y + 9, 8, 1);
      return;
    }
    // squash on the ground before a hop
    const crouch = this.grounded && this.wait < 12 ? 1 : 0;
    disc(ctx, cx, cy + crouch, 6, 'ink.0');
    disc(ctx, cx, cy + crouch, 5, 'orange.2');
    disc(ctx, cx - 1, cy - 1 + crouch, 3, 'orange.3');
    ctx.fillStyle = col('ink.0');                               // angry brow + eyes
    ctx.fillRect(cx - 3, cy - 2 + crouch, 2, 2); ctx.fillRect(cx + 1, cy - 2 + crouch, 2, 2);
    ctx.fillRect(cx - 4, cy - 4 + crouch, 3, 1); ctx.fillRect(cx + 1, cy - 4 + crouch, 3, 1);
    // the unpaired electron, orbiting
    const a = t / 5;
    const ex = cx + Math.round(Math.cos(a) * 9), ey = cy + Math.round(Math.sin(a) * 4);
    ctx.fillStyle = col('cyan.2');
    for (let i = 1; i < 6; i++) {
      const b = a - i * 0.25;
      if (i % 2) ctx.fillRect(cx + Math.round(Math.cos(b) * 9), cy + Math.round(Math.sin(b) * 4), 1, 1);
    }
    ctx.fillStyle = col('ink.0'); ctx.fillRect(ex - 2, ey - 2, 4, 4);
    ctx.fillStyle = col('cyan.3'); ctx.fillRect(ex - 1, ey - 1, 2, 2);
  }
}

// map character → enemy class. Constructed as new Ctor(tx, ty, skin, level).
export const ENEMIES = { e: Walker, h: Hopper };
// characters the level loader already owns; digits are for set-piece marks
export const RESERVED_CHARS = '.#=^<>@FKcCGSNP0123456789';
export function registerEnemy(ch, Ctor) {
  if (RESERVED_CHARS.includes(ch)) console.error('[portfolio] enemy char "' + ch + '" is reserved by the level loader; pick another.');
  else if (ENEMIES[ch]) console.error('[portfolio] enemy char "' + ch + '" is registered twice; the last one wins. Pick another.');
  ENEMIES[ch] = Ctor;
}

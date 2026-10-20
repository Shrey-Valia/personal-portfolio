// Level objects: info blocks, bits, coffee, commit flags, the SHIP-IT
// goal, signs, the debug duck, ports, floating text.

import { TILE } from '../config.js';
import { col } from '../art/palette.js';
import { drawText, textWidth, wrap, lineHeight, textGrowth } from '../art/font.js';
import { drawFrame } from '../art/sprite.js';
import { overlaps } from '../engine/util.js';
import { disc, pill } from '../art/draw.js';

const C = (r) => col(r);

// ─── Info Block: hit it from below to log a fact ─────────────────────

export class InfoBlock {
  constructor(tx, ty, fact, kind = 'fact') {
    this.tx = tx; this.ty = ty;
    this.x = tx * TILE; this.y = ty * TILE; this.w = TILE; this.h = TILE;
    this.fact = fact; this.kind = kind;
    this.used = false;
    this.bump = 0;
  }

  init(level) {
    if (this.kind === 'fact' && level.game.progress.hasFact(this.fact)) this.used = true;
    if (this.kind === 'coffee' && level.state.used.has(this.key())) this.used = true;
  }

  key() { return level_key(this.tx, this.ty); }

  hit(level) {
    this.bump = 8;
    level.sfx('bump');
    level.bumpAbove(this);
    if (this.kind === 'fact') {
      level.discover(this.fact, this.x + 8, this.y - 4);
      this.used = true;
    } else if (!this.used) {
      this.used = true;
      level.state.used.add(this.key());
      level.spawn(new Coffee(this.x + 2, this.y, true));
      level.drinkCoffee(this.x + 8, this.y - 10);
    }
  }

  update() { if (this.bump > 0) this.bump--; }

  draw(ctx, cam, t, A) {
    const off = this.bump > 0 ? -Math.round(Math.sin(((8 - this.bump) / 8) * Math.PI) * 5) : 0;
    const x = this.x - cam.x, y = this.y - cam.y + off;
    if (this.kind === 'coffee') {
      ctx.drawImage(A.used.c, x, y);
      ctx.fillStyle = C('slate.1'); ctx.fillRect(x + 3, y + 3, 10, 9);
      if (!this.used) ctx.drawImage(A.coffee[(t >> 4) & 1].c, x + 2, y + 2);
      return;
    }
    if (this.used) { ctx.drawImage(A.used.c, x, y); return; }
    ctx.drawImage(A.info[(t >> 5) & 1].c, x, y);
    // a soft pulse on undiscovered blocks so they read as interactive
    if (((t >> 3) & 15) === 0) { ctx.fillStyle = 'rgba(111,214,200,0.35)'; ctx.fillRect(x + 1, y + 1, 14, 1); }
  }
}

function level_key(tx, ty) { return tx + ',' + ty; }

// ─── bits: the currency (100 = extra life) ───────────────────────────

export class Bit {
  constructor(x, y, rising = false) {
    this.x = x + 4; this.y = y + 4; this.w = 8; this.h = 8;
    this.alive = true;
    this.rising = rising ? 24 : 0;
    this.vy = rising ? -3.2 : 0;
  }
  update(level) {
    if (this.rising) {
      this.y += this.vy; this.vy += 0.22;
      if (--this.rising <= 0) { this.alive = false; level.collectBit(this, true); }
    }
  }
  touch(hero, level) { if (!this.rising) { this.alive = false; level.collectBit(this); } }
  draw(ctx, cam, t, A) {
    const seq = [0, 1, 2, 1];
    const i = seq[(t >> 3) & 3];
    const fr = A.bit[i];
    drawFrame(ctx, fr, this.x - cam.x, this.y - cam.y, ((t >> 3) & 3) === 3, 8);
  }
}

// ─── coffee: a one-hit shield ────────────────────────────────────────

// a coffee cup: collectable, or (popped) a short rise-and-vanish flourish
export class Coffee {
  constructor(x, y, popped = false) {
    this.x = x; this.y = y; this.w = 12; this.h = 11; this.alive = true;
    this.rise = 16; this.baseY = y - 12; this.popped = popped; this.life = 34;
  }
  update() {
    if (this.rise > 0) { this.rise--; this.y = this.baseY + this.rise * 0.75; }
    if (this.popped && --this.life <= 0) this.alive = false;
  }
  touch(hero, level) {
    if (this.rise > 0 || this.popped) return;
    this.alive = false;
    level.drinkCoffee(this.x + 6, this.y);
  }
  draw(ctx, cam, t, A) { drawFrame(ctx, A.coffee[(t >> 4) & 1], this.x - cam.x, this.y - cam.y - 1, false); }
}

// ─── commit flag: the checkpoint ─────────────────────────────────────

export class Checkpoint {
  constructor(tx, ty, hash) {
    this.x = tx * TILE + 2; this.y = (ty + 1) * TILE - 30; this.w = 12; this.h = 30;
    this.tx = tx; this.ty = ty;
    this.hash = hash;
    this.on = false;
    this.wave = 0;
  }
  touch(hero, level) {
    if (this.on) return;
    this.on = true;
    level.checkpointReached(this);
  }
  update() { this.wave++; }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 1, y, 2, 30);
    ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 3, y, 1, 30);
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y + 28, 7, 2);
    const flag = this.on ? C('green.2') : C('slate.2');
    const hi = this.on ? C('green.3') : C('slate.3');
    for (let i = 0; i < 12; i++) {
      const dy = Math.round(Math.sin((t + i * 4) / 9) * (this.on ? 1 : 0.5));
      ctx.fillStyle = i < 2 ? hi : flag;
      ctx.fillRect(x + 4 + i, y + 2 + dy, 1, 8);
    }
    if (this.on) {
      ctx.fillStyle = C('white.2');
      ctx.fillRect(x + 8, y + 6, 1, 1); ctx.fillRect(x + 9, y + 7, 1, 1); ctx.fillRect(x + 10, y + 6, 1, 1);
      ctx.fillRect(x + 11, y + 5, 1, 1); ctx.fillRect(x + 12, y + 4, 1, 1);
    }
  }
}

// ─── SHIP-IT button: the goal ────────────────────────────────────────

export class Goal {
  constructor(tx, ty, label) {
    this.x = tx * TILE - 8; this.y = (ty + 1) * TILE - 22; this.w = 32; this.h = 22;
    this.label = label;
    this.pressed = 0;
  }
  touch(hero, level) {
    if (this.pressed) return;
    this.pressed = 1;
    level.reachGoal(this);
  }
  update() { if (this.pressed && this.pressed < 6) this.pressed++; }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    // label board floating above
    const lw = textWidth(this.label, 7) + 10;
    const lh = lineHeight(7) + 4;
    const bob = Math.round(Math.sin(t / 20) * 1);
    pill(ctx, x + 16 - lw / 2, y - 10 - lh + bob, lw, lh, 'rgba(16,20,42,0.92)', '#ffd166', 3);
    drawText(ctx, this.label, x + 16, y - 10 - lh + 2 + bob, '#ffd166', { align: 'center', size: 7 });
    // pedestal
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 2, y + 9, 28, 13);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 3, y + 10, 26, 11);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 3, y + 10, 26, 2);
    ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 3, y + 19, 26, 2);
    ctx.fillStyle = C('gold.2'); for (let i = 0; i < 5; i++) ctx.fillRect(x + 5 + i * 5, y + 15, 3, 2);
    // the big button
    const p = this.pressed ? Math.min(3, this.pressed) : 0;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 5, y + 2 + p, 22, 8 - p);
    ctx.fillStyle = C('red.2'); ctx.fillRect(x + 6, y + 3 + p, 20, 6 - p);
    ctx.fillStyle = C('red.3'); ctx.fillRect(x + 8, y + 3 + p, 12, 2);
    ctx.fillStyle = C('red.1'); ctx.fillRect(x + 6, y + 8, 20, 1);
  }
}

// ─── sign: role headers; walk past to read, Enter to re-read ────────

export class Sign {
  constructor(tx, ty, fact, auto) {
    this.x = tx * TILE; this.y = (ty + 1) * TILE - 16; this.w = 16; this.h = 16;
    this.fact = fact; this.auto = auto;
    this.near = false;
  }
  touch(hero, level) { level.nearSign(this); }
  draw(ctx, cam, t, A, level) {
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.drawImage(A.sign.c, x, y);
    const found = level.game.progress.hasFact(this.fact);
    const bob = Math.round(Math.sin(t / 10) * 1.5);
    if (!found) drawText(ctx, '!', x + 8, y - 13 + bob, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 10, weight: 700 });
    else if (this.near) drawText(ctx, 'Enter to read', x + 8, y - 11 + bob, '#5ce1e6', { align: 'center', shadow: '#0b0d17', size: 6.5 });
  }
}

// ─── the debug duck: one-line hints ──────────────────────────────────

export class Duck {
  constructor(tx, ty, text) {
    this.x = tx * TILE + 2; this.y = (ty + 1) * TILE - 12; this.w = 12; this.h = 12;
    this.text = text;
    this.near = 0;
  }
  update(level) {
    const h = level.hero;
    const d = Math.abs(h.x + h.w / 2 - (this.x + 6));
    this.near = d < 56 ? Math.min(12, this.near + 1) : Math.max(0, this.near - 1);
  }
  draw(ctx, cam, t, A) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const bob = (t >> 4) & 1;
    drawFrame(ctx, A.duck[bob], x - 1, y - 1 + (bob ? -1 : 0), false);
    if (this.near > 4) bubble(ctx, this.text, x + 6, y - 6);
  }
}

export function bubble(ctx, text, cx, bottom, maxW = 120) {
  const SIZE = 7;
  maxW = Math.min(ctx.W - 16, maxW * Math.min(1.8, textGrowth(SIZE)));   // bigger floor, wider bubble
  const lines = wrap(text, maxW, SIZE);
  const lh = lineHeight(SIZE);
  const w = Math.ceil(Math.max(...lines.map((l) => textWidth(l, SIZE)))) + 12;
  const h = lines.length * lh + 8;
  let x = Math.round(cx - w / 2);
  x = Math.max(4, Math.min(ctx.W - w - 4, x));
  const y = Math.round(bottom - h - 5);
  pill(ctx, x, y, w, h, '#fbf8f1', '#0b0d17', 4);
  ctx.beginPath();                                      // the tail
  ctx.moveTo(cx - 3, y + h - 0.5); ctx.lineTo(cx, y + h + 4); ctx.lineTo(cx + 3, y + h - 0.5);
  ctx.fillStyle = '#fbf8f1'; ctx.fill();
  lines.forEach((l, i) => drawText(ctx, l, x + 6, y + 4 + i * lh, '#1b1e2b', { size: SIZE, weight: 500 }));
}

// ─── port: a gunmetal conduit with an octagonal cap ──────────────────

export class Port {
  constructor(tx, ty, depth, link, band) {
    this.tx = tx; this.ty = ty;
    this.x = tx * TILE; this.y = ty * TILE; this.w = 32; this.h = depth * TILE;
    this.link = link;                     // { to, exit } or { to: '@map' }
    this.band = band || 'teal.2';
    this.glow = 0;
  }
  standingOn(hero) {
    return hero.grounded && Math.abs(hero.y + hero.h - this.y) < 1 &&
      hero.x + hero.w > this.x + 4 && hero.x < this.x + this.w - 4;
  }
  draw(ctx, cam, t, A, level) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const ink = C('ink.0'), s1 = C('steel.1'), s2 = C('steel.2'), s3 = C('steel.3'), s4 = C('steel.4');
    // body
    ctx.fillStyle = ink; ctx.fillRect(x + 2, y + 8, 28, this.h - 8);
    ctx.fillStyle = s2; ctx.fillRect(x + 3, y + 8, 26, this.h - 8);
    ctx.fillStyle = s3; ctx.fillRect(x + 5, y + 8, 6, this.h - 8);
    ctx.fillStyle = s4; ctx.fillRect(x + 6, y + 8, 2, this.h - 8);
    ctx.fillStyle = s1; ctx.fillRect(x + 24, y + 8, 5, this.h - 8);
    // coloured band
    ctx.fillStyle = C(this.band); ctx.fillRect(x + 3, y + 13, 26, 3);
    ctx.fillStyle = ink; ctx.fillRect(x + 3, y + 16, 26, 1);
    // octagonal cap: chamfered corners, no lip
    ctx.fillStyle = ink;
    ctx.fillRect(x + 2, y, 28, 9); ctx.fillRect(x + 1, y + 1, 30, 7); ctx.fillRect(x, y + 2, 32, 5);
    ctx.fillStyle = s3; ctx.fillRect(x + 2, y + 1, 28, 7); ctx.fillRect(x + 1, y + 2, 30, 5);
    ctx.fillStyle = s4; ctx.fillRect(x + 3, y + 1, 26, 1);
    ctx.fillStyle = s1; ctx.fillRect(x + 2, y + 7, 28, 1);
    // glowing inner ring
    const pulse = ((t >> 3) & 7) < 4;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 6, y + 2, 20, 3);
    ctx.fillStyle = pulse ? C('teal.3') : C('teal.2');
    ctx.fillRect(x + 6, y + 2, 20, 1); ctx.fillRect(x + 5, y + 3, 1, 1); ctx.fillRect(x + 26, y + 3, 1, 1);
    // ▼ when the hero stands on it
    if (level && this.standingOn(level.hero) && level.hero.state === 'normal') {
      const bob = (t >> 3) & 1;
      drawText(ctx, '▼', x + 16, Math.max(18, y - 30 - bob), '#5ce1e6', { align: 'center', shadow: '#0b0d17', size: 9 });
    }
  }
}

// ─── floating text ───────────────────────────────────────────────────

export class Floater {
  constructor(x, y, text, color = '#ffd166', life = 50) {
    this.x = x; this.y = y; this.text = text; this.color = color; this.life = life; this.max = life; this.alive = true;
  }
  update() { this.y -= this.life > this.max - 20 ? 0.6 : 0.15; if (--this.life <= 0) this.alive = false; }
  draw(ctx, cam) {
    if (this.life < 10 && (this.life & 1)) return;
    drawText(ctx, this.text, this.x - cam.x, Math.max(22, this.y - cam.y), this.color, { align: 'center', shadow: '#0b0d17', size: 7, weight: 700 });
  }
}

// a fact token: >_ icon arcing up out of the block
export class FactToken {
  constructor(x, y) { this.x = x; this.y = y; this.vy = -3.6; this.life = 34; this.alive = true; }
  update() { this.y += this.vy; this.vy += 0.16; if (--this.life <= 0) this.alive = false; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.max(24, Math.round(this.y - cam.y));
    pill(ctx, x - 7, y - 6, 14, 12, C('indigo.2'), '#0b0d17', 2);
    drawText(ctx, '>_', x, y - 5, '#6fd6c8', { align: 'center', size: 7, weight: 700 });
  }
}

export { overlaps, disc };

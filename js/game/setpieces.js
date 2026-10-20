// Set pieces: the mechanics that make each level depict its work.
// Oak Ridge: monomers that self-assemble into chain bridges, browser
// windows with a RUN progress-bar bridge, inverse-design sliders that rise
// into steps, synchronized GPU lifts. Plus decor: banners, panels, racks.

import { TILE } from '../config.js';
import { col } from '../art/palette.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { clamp, lerp, ease, rng } from '../engine/util.js';
import { line, pill } from '../art/draw.js';

const C = (r) => col(r);
export const platform = (x, y, w, h = 4, active = true) => ({ x, y, w, h, prevX: x, prevY: y, active, oneway: true });

// ─── self-assembling polymer bridge ──────────────────────────────────
// Monomers jitter (Brownian) above the pit; when you approach they snap
// into a bonded chain that you can walk on. Once built, it stays built.

export class Assembly {
  constructor(tx, ty, spec, level, key) {
    this.key = key;
    const r = rng(tx * 31 + ty);
    this.segs = spec.segs.map(([dx, dy, len]) => ({ x: (tx + dx) * TILE, y: (ty + dy) * TILE, w: len * TILE }));
    this.x0 = this.segs[0].x;
    this.x1 = Math.max(...this.segs.map((s) => s.x + s.w));
    this.plats = this.segs.map((s) => platform(s.x, s.y, s.w, 4, false));
    level.platforms.push(...this.plats);
    this.beads = [];
    this.segs.forEach((s, si) => {
      const n = Math.round(s.w / 8);
      for (let j = 0; j < n; j++) {
        const tx2 = s.x + j * 8 + 4, ty2 = s.y + 3;
        this.beads.push({
          si, tx: tx2, ty: ty2,
          hx: tx2 + (r() - 0.5) * 36, hy: ty2 + 14 + r() * 36,
          jx: 0, jy: 0, p: 0, k: r() < 0.5 ? 'magenta' : 'teal',
        });
      }
    });
    this.built = level.state.built.has(key);
    this.t = this.built ? 999 : 0;
    this.triggered = this.built;
  }

  update(level) {
    const h = level.hero;
    if (!this.triggered && h.x + h.w > this.x0 - 136 && h.x < this.x1 + 40) {
      this.triggered = true;
      level.sfx('build');
      level.state.built.add(this.key);
    }
    if (this.triggered) this.t++;
    const done = this.segs.map(() => true);
    this.beads.forEach((b, i) => {
      b.jx = clamp(b.jx + (Math.random() - 0.5) * 0.8, -3, 3);
      b.jy = clamp(b.jy + (Math.random() - 0.5) * 0.8, -3, 3);
      b.p = this.triggered ? ease.outBack(clamp((this.t - i * 1.1) / 26, 0, 1)) : 0;
      if (b.p < 0.85) done[b.si] = false;
    });
    this.plats.forEach((p, i) => { p.active = done[i]; });
  }

  draw(ctx, cam, t) {
    const pos = this.beads.map((b) => {
      const k = Math.min(1, b.p);
      const wob = 1 - k;
      return [lerp(b.hx + b.jx, b.tx, b.p) - cam.x + Math.sin(t / 9 + b.hx) * wob,
        lerp(b.hy + b.jy, b.ty, b.p) - cam.y + Math.cos(t / 11 + b.hy) * wob];
    });
    // bonds: drawn once neighbours are close to place
    for (let i = 1; i < this.beads.length; i++) {
      const a = this.beads[i - 1], b = this.beads[i];
      if (a.si !== b.si && Math.abs(a.ty - b.ty) > 20) continue;
      if (a.p > 0.7 && b.p > 0.7) line(ctx, pos[i - 1][0], pos[i - 1][1], pos[i][0], pos[i][1], 'teal.3');
    }
    this.beads.forEach((b, i) => {
      const [x, y] = pos[i];
      const rx = Math.round(x), ry = Math.round(y);
      ctx.fillStyle = C('ink.0'); ctx.fillRect(rx - 3, ry - 2, 6, 5); ctx.fillRect(rx - 2, ry - 3, 4, 7);
      ctx.fillStyle = C(b.k + '.2'); ctx.fillRect(rx - 2, ry - 2, 4, 4);
      ctx.fillStyle = C(b.k + '.3'); ctx.fillRect(rx - 2, ry - 2, 2, 1); ctx.fillRect(rx - 2, ry - 1, 1, 1);
    });
  }
}

// ─── RUN ▶: a progress bar that extrudes into a bridge ───────────────

export class RunBar {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.y = ty * TILE; this.w = spec.len * TILE;
    this.fact = spec.fact;
    this.fill = level.game.progress.hasFact(this.fact) ? 1 : 0;
    this.running = false;
    this.plat = platform(this.x, this.y, this.w * this.fill, 6, this.fill > 0);
    level.platforms.push(this.plat);
  }
  onFact(id, level) { if (id === this.fact && this.fill < 1) { this.running = true; level.sfx('build'); } }
  update(level) {
    if (!this.running) return;
    this.fill = Math.min(1, this.fill + 1 / 100);
    this.plat.w = this.w * this.fill;
    this.plat.active = this.fill > 0.04;
    if (this.fill >= 1) { this.running = false; level.sfx('checkpoint'); }
  }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    // empty track
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, this.w + 2, 8);
    ctx.fillStyle = C('slate.0'); ctx.fillRect(x, y, this.w, 6);
    const fw = Math.round(this.w * this.fill);
    if (fw > 0) {
      ctx.fillStyle = C('teal.2'); ctx.fillRect(x, y, fw, 6);
      ctx.fillStyle = C('teal.3'); ctx.fillRect(x, y, fw, 2);
      ctx.fillStyle = C('green.2'); ctx.fillRect(x + fw - 2, y, 2, 6);
      // a shine sweeping along the filled part
      const sx = (t * 3) % (this.w + 40) - 20;
      if (sx > 0 && sx < fw - 4) { ctx.fillStyle = C('white.2'); ctx.fillRect(x + sx, y + 1, 3, 1); }
    }
    const label = this.fill >= 1 ? 'Run complete ✓' : this.fill > 0 ? 'Running… ' + Math.round(this.fill * 100) + '%' : 'Hit RUN ▶ to build';
    drawText(ctx, label, x + this.w / 2, y - 14, this.fill >= 1 ? '#90eaa8' : '#ffd166', { align: 'center', shadow: '#0b0d17', size: 7.5 });
  }
}

// ─── browser windows: decor, with title bars you can stand on ───────

export class Browsers {
  constructor(tx, ty, spec, level) {
    this.wins = spec.wins.map((w) => ({ x: (tx + w.dx) * TILE, y: (ty + w.dy) * TILE, w: w.w * TILE, h: w.h * TILE, title: w.title, kind: w.kind }));
    for (const w of this.wins) level.platforms.push(platform(w.x, w.y, w.w, 4));
  }
  back(ctx, cam, t) {
    for (const w of this.wins) {
      const x = w.x - cam.x, y = w.y - cam.y;
      if (x > ctx.W || x + w.w < 0) continue;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, w.w + 2, w.h + 2);
      ctx.fillStyle = '#0f1430'; ctx.fillRect(x, y, w.w, w.h);
      ctx.fillStyle = C('indigo.2'); ctx.fillRect(x, y, w.w, 9);
      ctx.fillStyle = C('indigo.3'); ctx.fillRect(x, y, w.w, 1);
      [['red.2', 0], ['gold.2', 5], ['green.2', 10]].forEach(([c, dx]) => { ctx.fillStyle = C(c); ctx.fillRect(x + 4 + dx, y + 3, 3, 3); });
      drawText(ctx, w.title, x + 22, y + 1, '#e3e6ee', { size: 6.5 });
      if (w.kind === 'config') {
        for (let i = 0; i < 4; i++) {
          const ry = y + 16 + i * 11;
          if (ry > y + w.h - 6) break;
          ctx.fillStyle = C('slate.2'); ctx.fillRect(x + 8, ry + 2, w.w - 16, 1);
          const k = (Math.sin(t / 50 + i * 1.7) * 0.5 + 0.5) * (w.w - 22);
          ctx.fillStyle = C('teal.3'); ctx.fillRect(x + 8 + k, ry, 4, 5);
        }
      } else if (w.kind === 'loss') {
        // a training-loss curve that keeps drawing itself
        const n = Math.floor(((t / 2) % (w.w - 16)));
        let py = null;
        for (let i = 0; i < n; i++) {
          const v = Math.exp(-i / 30) * 0.8 + 0.12 + Math.sin(i * 1.3) * 0.03;
          const yy = Math.round(y + 14 + (1 - v) * 0 + v * (w.h - 22));
          ctx.fillStyle = C('gold.2'); ctx.fillRect(x + 8 + i, yy, 1, py === null ? 1 : Math.max(1, py - yy + 1));
          py = yy;
        }
        ctx.fillStyle = C('slate.2'); ctx.fillRect(x + 8, y + w.h - 7, w.w - 16, 1);
      }
    }
  }
}

// ─── inverse design: target properties in, design inputs out ────────

export class Sliders {
  constructor(tx, ty, spec, level) {
    this.fact = spec.fact;
    this.rest = spec.rest;
    this.tracks = spec.tracks.map(([ttx, target]) => {
      const x = ttx * TILE + 8 - 12;
      const p = platform(x, spec.rest, 24, 6);
      level.platforms.push(p);
      return { x, target, p };
    });
    this.on = level.game.progress.hasFact(this.fact);
    this.t = this.on ? 999 : 0;
    this.update();
  }
  onFact(id, level) { if (id === this.fact) { this.on = true; this.t = 0; level.sfx('build'); } }
  update() {
    if (this.on) this.t++;
    this.tracks.forEach((tr, i) => {
      const k = this.on ? ease.outBack(clamp((this.t - i * 16) / 40, 0, 1)) : 0;
      tr.p.prevY = tr.p.y;
      tr.p.y = Math.round(lerp(this.rest, tr.target, k));
    });
  }
  draw(ctx, cam) {
    for (const tr of this.tracks) {
      const x = tr.x - cam.x, cx = x + 12;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(cx - 2, tr.target - cam.y - 6, 4, this.rest - tr.target + 14);
      ctx.fillStyle = C('slate.1'); ctx.fillRect(cx - 1, tr.target - cam.y - 5, 2, this.rest - tr.target + 12);
      const y = tr.p.y - cam.y;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, 26, 8);
      ctx.fillStyle = C('gold.2'); ctx.fillRect(x, y, 24, 6);
      ctx.fillStyle = C('gold.3'); ctx.fillRect(x, y, 24, 1);
      ctx.fillStyle = C('gold.1'); ctx.fillRect(x, y + 5, 24, 1); ctx.fillRect(x + 11, y + 1, 2, 4);
    }
  }
}

// ─── parallel GPU lifts: four platforms moving in lockstep ───────────

export class Lifts {
  constructor(tx, ty, spec, level) {
    this.top = spec.top; this.bottom = spec.bottom; this.period = spec.period || 220;
    this.plats = [];
    for (let i = 0; i < spec.n; i++) {
      const p = platform((tx + i * spec.gap) * TILE, spec.bottom, 32, 6);
      this.plats.push(p);
      level.platforms.push(p);
    }
    this.t = 0;
    this.racks = { x: tx * TILE - 8, w: ((spec.n - 1) * spec.gap + 2) * TILE + 16 };
  }
  update() {
    this.t++;
    const k = (1 - Math.cos((this.t / this.period) * Math.PI * 2)) / 2;
    const y = Math.round(lerp(this.bottom, this.top, k));
    for (const p of this.plats) { p.prevX = p.x; p.prevY = p.y; p.y = y; }
  }
  back(ctx, cam, t) {
    // GPU racks: cabinets with blinking activity LEDs, one per lift
    this.plats.forEach((p, i) => {
      const x = p.x - cam.x - 4, y = this.top - cam.y - 34, h = this.bottom - this.top + 44;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, 42, h + 2);
      ctx.fillStyle = '#121833'; ctx.fillRect(x, y, 40, h);
      ctx.fillStyle = C('steel.2'); ctx.fillRect(x, y, 40, 1);
      drawText(ctx, 'GPU ' + i, x + 20, y + 3, '#8a95b4', { align: 'center', size: 6 });
      for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) {
        const on = ((t >> 2) + r * 7 + c * 13 + i * 5) % 11 < 4;
        ctx.fillStyle = on ? C(c % 3 ? 'green.2' : 'teal.3') : C('slate.0');
        ctx.fillRect(x + 6 + c * 5, y + 14 + r * 7, 2, 2);
      }
    });
  }
  draw(ctx, cam) {
    for (const p of this.plats) {
      const x = p.x - cam.x, y = p.y - cam.y;
      ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 4, this.top - cam.y - 34, 1, y - (this.top - cam.y - 34));
      ctx.fillRect(x + 27, this.top - cam.y - 34, 1, y - (this.top - cam.y - 34));
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, 34, 8);
      ctx.fillStyle = C('steel.3'); ctx.fillRect(x, y, 32, 6);
      ctx.fillStyle = C('steel.4'); ctx.fillRect(x, y, 32, 1);
      ctx.fillStyle = C('teal.3'); ctx.fillRect(x + 3, y + 3, 26, 1);
    }
  }
}

// ─── decor: banner sign, text panels, world hints ───────────────────

export class Banner {
  constructor(tx, ty, spec) { this.x = tx * TILE + 8; this.y = ty * TILE; this.text = spec.text; this.sub = spec.sub; this.post = spec.post || 80; }
  back(ctx, cam, t) {
    const w = Math.ceil(Math.max(textWidth(this.text, 8.5, 700), textWidth(this.sub || '', 7))) + 20;
    const l1 = lineHeight(8.5), l2 = this.sub ? lineHeight(7) : 0;
    const h = 6 + l1 + l2 + 6;
    const x = Math.round(this.x - cam.x - w / 2), y = this.y - cam.y;
    ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 10, y + h, 3, this.post + 26 - h); ctx.fillRect(x + w - 13, y + h, 3, this.post + 26 - h);
    pill(ctx, x, y, w, h, C('indigo.1'), '#0b0d17', 3);
    drawText(ctx, this.text, x + w / 2, y + 5, '#f5f1e6', { align: 'center', size: 8.5, weight: 700 });
    if (this.sub) drawText(ctx, this.sub, x + w / 2, y + 5 + l1, '#6fd6c8', { align: 'center', size: 7 });
    // marquee lights along the bottom edge
    for (let i = 6; i < w - 6; i += 6) {
      ctx.fillStyle = ((i / 6 + (t >> 3)) & 3) === 0 ? C('gold.3') : C('gold.1');
      ctx.fillRect(x + i, y + h - 3, 2, 1);
    }
  }
}

export class Panel {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.y = ty * TILE; this.w = spec.w * TILE; this.h = spec.h * TILE;
    this.title = spec.title; this.kind = spec.kind; this.fact = spec.fact;
    this.level = level;
  }
  back(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    pill(ctx, x, y, this.w, this.h, '#0c1029', '#2c3566', 3);
    drawText(ctx, this.title, x + 5, y + 2, '#6fd6c8', { size: 6.5 });
    const solved = !this.fact || this.level.game.progress.hasFact(this.fact);
    const rows = Math.floor((this.h - 16) / 9);
    for (let i = 0; i < rows; i++) {
      const ry = y + 15 + i * 9;
      ctx.fillStyle = C('slate.1'); ctx.fillRect(x + 6, ry + 2, this.w - 12, 2);
      if (this.kind === 'target') {
        const k = 0.3 + ((i * 37) % 60) / 100;
        ctx.fillStyle = C('magenta.2'); ctx.fillRect(x + 6 + Math.round(k * (this.w - 14)), ry, 2, 6);
      } else if (solved) {
        const k = 0.25 + ((i * 53) % 55) / 100;
        ctx.fillStyle = C('gold.2'); ctx.fillRect(x + 6, ry + 1, Math.round(k * (this.w - 12)), 4);
      } else if ((t >> 4) & 1) {
        drawText(ctx, '?', x + this.w / 2, ry - 2, '#8a95b4', { align: 'center', size: 7 });
      }
    }
  }
}

export const SETPIECES = { assembly: Assembly, runbar: RunBar, browsers: Browsers, sliders: Sliders, lifts: Lifts, banner: Banner, panel: Panel };

// themes add their own: new Ctor(tx, ty, spec, level, key) with optional
// update(level), back(ctx,cam,t), draw(ctx,cam,t), onFact(id, level)
export function registerSetpiece(name, Ctor) { SETPIECES[name] = Ctor; }

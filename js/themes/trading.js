// Trading Floor: a navy market terminal. The ground is drawn as an equity
// curve (a phosphor line over a shaded area chart) and the sky is chart
// grid with a ticker tape. No invented numbers: the only figures on screen
// are read from the résumé text in index.html at runtime.
//
// Set pieces (all prefixed trade.):
//   banner      the simulated-portfolio sign ($ amount read from p-trade-1)
//   autopilot   the RL agent's cart: rides a price line across asset-class
//               panels with the controls locked, no manual input (p-trade-1)
//   align       two market-data feeds slide into time alignment and stack
//               into stairs; bad ticks are cleaned out first (p-trade-2)
//   qtable      Training Gym floor: cells light up as you explore, and the
//               whole table trains once p-trade-3 is logged
//   spring      the entry signal (▲) that launches you; it needs training
//   models      Q-learning and PPO panels on the gym wall
//   candles     up candles are hollow and rise under you; down candles are
//               filled and sink (shape and motion cues, not just colour)
//   walkforward train/test folds that step forward and up, the classic
//               walk-forward diagram you climb
//   results     the backtest board; figures come from p-trade-4's text
//   label       a short caption that can change once a fact is logged

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSkin } from '../art/sprites/actors.js';
import { registerSetpiece, platform, Banner } from '../game/setpieces.js';
import { registerEnemy, Hopper } from '../game/enemies.js';
import { registerSong, steps } from '../engine/audio.js';
import { drawText, textWidth } from '../art/font.js';
import { stripedSky, pill, line, noise1 } from '../art/draw.js';
import { Floater } from '../game/objects.js';
import { clamp, lerp, ease, rng, approach } from '../engine/util.js';

const C = (r) => col(r);
const T = TILE;
const INK = '#0b0d17';
const UP = '#90eaa8', DOWN = '#ff8f7f';

const label = (ctx, text, x, y, color = '#e3e6ee', size = 6.5) =>
  drawText(ctx, text, x, y, color, { align: 'center', shadow: INK, size });

// the résumé is the only source of numbers in this level
function factText(id) {
  const el = typeof document !== 'undefined' && document.querySelector(`[data-fact="${id}"]`);
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

// small ▲ / ▼ glyphs drawn as pixels, so the shape reads without colour
function arrow(ctx, x, y, up, color, s = 3) {
  ctx.fillStyle = C(color);
  for (let i = 0; i < s; i++) {
    const w = 1 + i * 2, yy = up ? y + i : y + s - 1 - i;
    ctx.fillRect(Math.round(x - i), Math.round(yy), w, 1);
  }
}

// ─── terrain: the equity curve over a shaded area chart ─────────────

function curveKit(accent, accent2, tint, deep) {
  const P = { line: C(accent), line2: C(accent2), grid: C('#15264d'), seam: C('ink.0'), tint: tint.map(C), deep: deep.map(C) };
  return {
    terrain(ctx, x, y, m, tx, ty, map) {
      let d = 0;
      while (d < 3 && map.isTerrain(tx, ty - d - 1)) d++;
      if (d === 0) for (let j = 0; j < 16; j++) { ctx.fillStyle = P.tint[Math.min(3, j >> 2)]; ctx.fillRect(x, y + j, 16, 1); }
      else { ctx.fillStyle = P.deep[d - 1]; ctx.fillRect(x, y, 16, 16); }
      // chart grid under the curve
      if (tx % 2 === 0) vline(ctx, x, y, 16, P.grid);
      hline(ctx, x, y + 15, 16, P.grid);
      if (!(m & 1)) { hline(ctx, x, y, 16, P.line); hline(ctx, x, y + 1, 16, P.line2); }
      if (!(m & 8)) { vline(ctx, x, y, 16, P.line); vline(ctx, x + 1, y + (m & 1 ? 0 : 2), 16, P.line2); }
      if (!(m & 2)) { vline(ctx, x + 15, y, 16, P.line); vline(ctx, x + 14, y + (m & 1 ? 0 : 2), 16, P.line2); }
    },
    // one-ways: a price level, drawn as a dashed bar
    oneway(ctx, x, y) {
      ctx.fillStyle = P.seam; ctx.fillRect(x, y, 16, 5);
      ctx.fillStyle = C('#163a5c'); ctx.fillRect(x, y, 16, 4);
      hline(ctx, x, y, 16, P.line);
      for (let i = 2; i < 16; i += 4) vline(ctx, x + i, y + 1, 2, P.line2);
    },
    animated() {},
  };
}

registerKit('trading', curveKit('green.3', 'green.2', ['#15403f', '#133442', '#11293e', '#0f2139'], ['#0e1c36', '#0c1830', '#0a142b']));
registerKit('tradingGym', curveKit('gold.3', 'gold.2', ['#3a2e2a', '#2c2433', '#221d33', '#1b1830'], ['#191630', '#15132b', '#121127']));

// ─── backdrop: chart grid, a dim candlestick history, and a ticker tape
// that carries the project's stack (read from index.html)

function tradingBackdrop(W) {
  const sky = strip(W, (ctx) => stripedSky(ctx, W, H, ['#050816', '#081027', '#0b1636', '#0e1b40']));

  const grid = strip(480, (ctx, w) => {
    ctx.fillStyle = C('#0f1c44');
    for (let x = 0; x < w; x += 24) ctx.fillRect(x, 30, 1, H);
    for (let y = 42; y < H; y += 24) ctx.fillRect(0, y, w, 1);
  });

  // a seamless random walk with drift that wraps: candles in dim green and red
  const history = strip(960, (ctx, w) => {
    const n = noise1(21), m = noise1(4);
    const price = (x) => {
      const t = x / w;
      const v = n(t * 24) * (1 - t) + n((t - 1) * 24 + 128) * t;
      return 120 - v * 46 - Math.sin(t * Math.PI * 2) * 14 - m(x * 0.2) * 6;
    };
    for (let x = 4; x < w; x += 10) {
      const o = price(x - 5), c = price(x + 5);
      const hi = Math.min(o, c) - 4 - (x % 7), lo = Math.max(o, c) + 3 + (x % 5);
      const up = c < o;                              // y grows downward: lower y is higher price
      const top = Math.round(Math.min(o, c)), bot = Math.max(top + 2, Math.round(Math.max(o, c)));
      ctx.fillStyle = C(up ? '#1d4a3c' : '#4a1d2c');
      ctx.fillRect(x + 2, Math.round(hi), 1, Math.round(lo - hi));
      if (up) {                                      // hollow body
        ctx.fillRect(x, top, 5, 1); ctx.fillRect(x, bot, 5, 1); ctx.fillRect(x, top, 1, bot - top); ctx.fillRect(x + 4, top, 1, bot - top);
        ctx.fillStyle = C('#0a1330'); ctx.fillRect(x + 1, top + 1, 3, bot - top - 1);
      } else ctx.fillRect(x, top, 5, bot - top + 1);
    }
  });

  let tape = null;
  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, grid, camX, 0.12 * k, 0);
      blitStrip(ctx, history, camX, 0.08 * k, -camY * 0.1);
      // ticker tape just under the HUD: the project's stack, scrolling
      if (tape === null) {
        const role = typeof document !== 'undefined' && document.querySelector('[data-fact="p-trade"] .entry__role');
        tape = role ? role.textContent.split('·').map((s) => s.trim()).filter(Boolean) : [];
      }
      if (!tape.length) return;
      ctx.fillStyle = 'rgba(4,7,18,0.82)'; ctx.fillRect(0, 17, ctx.W, 11);
      ctx.fillStyle = C('#1d6b43'); ctx.fillRect(0, 28, ctx.W, 1);
      const items = tape.map((s) => ({ s, w: textWidth(s, 6.5) + 18 }));
      const total = items.reduce((a, b) => a + b.w, 0);
      let x = -(reduced ? 0 : (t * 0.35) % total);
      for (let rep = 0; x < ctx.W; rep++) {
        for (const it of items) {
          if (x > ctx.W) break;
          if (x + it.w > 0) {
            ctx.fillStyle = C('green.2'); ctx.fillRect(Math.round(x + 4), 22, 2, 2);
            drawText(ctx, it.s, x + 10, 18, '#90eaa8', { size: 6.5 });
          }
          x += it.w;
        }
        if (rep > 20) break;
      }
    },
  };
}

// Training Gym: a dark lab wall with a faint policy network
function gymBackdrop(W) {
  const bg = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#07061a', '#0c0a26', '#110e30']);
    ctx.fillStyle = C('#16123a');
    for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 1, H);
    for (let y = 16; y < H; y += 32) ctx.fillRect(0, y, W, 1);
  });
  return { draw(ctx) { ctx.drawImage(bg, 0, 0); } };
}

registerBackground('trading', tradingBackdrop);
registerBackground('tradingGym', gymBackdrop);

// ─── bugs: a red bear-market beetle and a hopping bad tick ──────────

registerSkin('trading', { d: 'red.1', b: 'red.2', c: 'red.3', t: 'gold.3', e: 'white.2', o: 'ink.0', l: 'slate.3' });

// a bad tick: a corrupted price print that hops at you, the same red ✕
// that gets cleaned out of the feeds
class BadTick extends Hopper {
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    if (this.flat) {
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x, y + 8, 12, 4);
      ctx.fillStyle = C('red.1'); ctx.fillRect(x + 1, y + 9, 10, 2);
      return;
    }
    const c = this.grounded && this.wait < 12 ? 1 : 0;
    // a stray wick and a candle body with a glitch tear through it
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 5, y - 3 + c, 2, 4); ctx.fillRect(x - 1, y + c, 14, 12 - c);
    ctx.fillStyle = C('red.3'); ctx.fillRect(x + 5, y - 2 + c, 1, 2);
    ctx.fillStyle = C('red.2'); ctx.fillRect(x, y + 1 + c, 12, 10 - c);
    ctx.fillStyle = C('red.3'); ctx.fillRect(x, y + 1 + c, 12, 1);
    const tear = (t >> 2) % 9 === 0 ? 2 : 0;
    ctx.fillStyle = C('red.1'); ctx.fillRect(x + tear, y + 7, 12 - tear, 1);
    ctx.fillStyle = C('white.2'); ctx.fillRect(x + 3, y + 3 + c, 2, 2); ctx.fillRect(x + 7, y + 3 + c, 2, 2);
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 2, y + 2 + c, 3, 1); ctx.fillRect(x + 7, y + 2 + c, 3, 1);
    // the ✕ of a bad print
    ctx.fillStyle = C('white.1');
    for (let j = 0; j < 3; j++) { ctx.fillRect(x + 4 + j, y + 8 + j , 1, 1); ctx.fillRect(x + 6 - j, y + 8 + j, 1, 1); }
  }
}
registerEnemy('z', BadTick);

// ─── set pieces ─────────────────────────────────────────────────────

class Label {
  constructor(tx, ty, spec, level) {
    this.x = tx * T + (spec.dx ?? 8); this.y = ty * T + (spec.dy ?? 0);
    this.spec = spec; this.level = level;
  }
  back(ctx, cam) {
    const s = this.spec;
    const done = s.fact && this.level.game.progress.hasFact(s.fact);
    label(ctx, done ? s.done : s.text, this.x - cam.x, this.y - cam.y, done ? UP : (s.color || '#c9d1e6'), s.size || 7);
  }
}

// the portfolio sign: its dollar figure is the one in p-trade-1
class PortfolioBanner extends Banner {
  constructor(tx, ty, spec, level) {
    const m = /\$[\d,]+/.exec(factText(spec.from));
    super(tx, ty, { ...spec, sub: m ? m[0] : '' }, level);
  }
}

// p-trade-1: the RL agent drives; your controls are locked for the ride
class Autopilot {
  constructor(tx, ty, spec, level, key) {
    this.fact = spec.fact; this.level = level;
    this.w = spec.w * T;
    this.pts = spec.path.map(([dx, dy]) => ({ x: (tx + dx) * T, y: (ty + dy) * T }));
    this.len = [0];
    for (let i = 1; i < this.pts.length; i++) this.len.push(this.len[i - 1] + Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y));
    this.L = this.len[this.len.length - 1];
    this.panels = spec.panels.map(([dx, dy, w, h, kind]) => ({ x: (tx + dx) * T, y: (ty + dy) * T, w: w * T, h: h * T, kind }));
    this.s = 0; this.mode = 'dock'; this.t = 0;
    this.plat = platform(this.pts[0].x, this.pts[0].y, this.w, 6);
    level.platforms.push(this.plat);
    this.chips = [];
  }
  online() { return this.level.game.progress.hasFact(this.fact); }
  pos(s) {
    for (let i = 1; i < this.pts.length; i++) {
      if (s <= this.len[i]) {
        const k = (s - this.len[i - 1]) / (this.len[i] - this.len[i - 1]);
        // ease each leg so the cart rocks through the chart's turns
        const e = ease.inOutCubic(k) * 0.4 + k * 0.6;
        return { x: lerp(this.pts[i - 1].x, this.pts[i].x, e), y: lerp(this.pts[i - 1].y, this.pts[i].y, e) };
      }
    }
    return this.pts[this.pts.length - 1];
  }
  update(level) {
    const h = level.hero, pl = this.plat;
    pl.prevX = pl.x; pl.prevY = pl.y;
    this.t++;
    if (this.mode === 'dock') {
      if (this.online() && h.state === 'normal' && h.ground === pl) {
        this.mode = 'ride'; this.t = 0;
        this.off = clamp(h.x - pl.x, 3, this.w - h.w - 3);
        h.setState('frozen'); h.vx = 0; h.vy = 0; h.facing = 1;
        level.sfx('build');
      }
    } else if (this.mode === 'ride') {
      if (this.t > 30) this.s = Math.min(this.L, this.s + 1.1);
      if (this.t > 30 && this.t % 56 === 0 && this.s < this.L - 20) {
        const buy = (this.t / 56) % 2 === 1;
        this.chips.push({ x: pl.x + this.w / 2 + (buy ? -38 : 38), y: pl.y - 14, buy, life: 50 });
        level.sfx('tick');
      }
      if (this.s >= this.L) { this.mode = 'arrive'; this.t = 0; }
    } else if (this.mode === 'arrive') {
      if (this.t === 24) {
        h.setState('normal'); h.grounded = true; h.ground = pl;
        level.sfx('checkpoint');
        level.floaters.push(new Floater(pl.x + this.w / 2, pl.y - 40, 'Trades placed for you', UP, 70));
      }
      const far = Math.abs(h.x + h.w / 2 - (pl.x + this.w / 2)) > 56;
      if (this.t > 24 && h.ground !== pl && (far || h.state === 'dead')) this.mode = 'back';
    } else if (this.mode === 'back') {
      this.s = Math.max(0, this.s - 2.5);
      if (this.s <= 0) this.mode = 'dock';
    }
    const p = this.pos(this.s);
    pl.x = Math.round(p.x); pl.y = Math.round(p.y);
    if (this.mode === 'ride' || (this.mode === 'arrive' && this.t < 24)) {
      h.x = pl.x + this.off; h.y = pl.y - h.h; h.vx = 0; h.vy = 0; h.grounded = true;
    }
    for (const c of this.chips) { c.y -= 0.45; c.life--; }
    this.chips = this.chips.filter((c) => c.life > 0);
  }
  back(ctx, cam, t) {
    // asset-class panels down in the chasm, each its own kind of chart
    this.panels.forEach((p, i) => {
      const x = p.x - cam.x, y = p.y - cam.y;
      pill(ctx, x, y, p.w, p.h, 'rgba(10,18,44,0.9)', '#22356a', 3);
      const r = rng(31 + i * 7);
      const n = Math.floor((p.w - 10) / 5);
      let v = 0.5;
      for (let j = 0; j < n; j++) {
        v = clamp(v + (r() - 0.45) * 0.3, 0.1, 0.9);
        const bx = x + 5 + j * 5, by = y + 6 + Math.round((1 - v) * (p.h - 14));
        if (p.kind === 'bars') { ctx.fillStyle = C(j % 3 ? 'cyan.1' : 'cyan.2'); ctx.fillRect(bx, by, 3, y + p.h - 5 - by); }
        else if (p.kind === 'line') { ctx.fillStyle = C('gold.2'); ctx.fillRect(bx, by, 5, 1); ctx.fillRect(bx + 4, by, 1, 2); }
        else {
          const up = r() < 0.55;
          ctx.fillStyle = C(up ? 'green.2' : 'red.2');
          ctx.fillRect(bx + 1, by - 3, 1, 9);
          if (up) { ctx.fillRect(bx, by - 1, 3, 1); ctx.fillRect(bx, by + 3, 3, 1); ctx.fillRect(bx, by - 1, 1, 5); ctx.fillRect(bx + 2, by - 1, 1, 5); }
          else ctx.fillRect(bx, by - 1, 3, 5);
        }
      }
    });
    const mid = this.panels.reduce((a, p) => a + p.x + p.w / 2, 0) / this.panels.length;
    label(ctx, 'Multiple asset classes', mid - cam.x, this.panels[0].y - 11 - cam.y, '#a8ecff', 6.5);
    // the rail: a price line the cart rides
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      line(ctx, a.x + this.w / 2 - cam.x, a.y + 15 - cam.y, b.x + this.w / 2 - cam.x, b.y + 15 - cam.y, 'green.3');
      line(ctx, a.x + this.w / 2 - cam.x, a.y + 16 - cam.y, b.x + this.w / 2 - cam.x, b.y + 16 - cam.y, 'green.1');
    }
    for (const p of this.pts) { ctx.fillStyle = C('green.3'); ctx.fillRect(p.x + this.w / 2 - cam.x - 1, p.y + 14 - cam.y, 3, 3); }
  }
  draw(ctx, cam, t) {
    const pl = this.plat, x = pl.x - cam.x, y = pl.y - cam.y, on = this.online();
    // the cart: a terminal on wheels
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, this.w + 2, 13);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x, y, this.w, 11);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x, y, this.w, 2);
    ctx.fillStyle = C('steel.1'); ctx.fillRect(x, y + 10, this.w, 1);
    ctx.fillStyle = C('#071a12'); ctx.fillRect(x + 4, y + 3, this.w - 8, 6);
    const riding = this.mode === 'ride';
    if (on) {
      // a little sparkline on the cart's screen
      for (let i = 0; i < this.w - 10; i++) {
        const v = Math.sin((i + (riding ? t >> 1 : 0)) * 0.5) * 1.2 + Math.sin(i * 0.17) * 0.8;
        ctx.fillStyle = C('green.3'); ctx.fillRect(x + 5 + i, y + 6 - Math.round(v), 1, 1);
      }
    } else {
      ctx.fillStyle = C('red.2'); ctx.fillRect(x + this.w / 2 - 4, y + 5, 8, 2);
    }
    for (const wx of [6, this.w - 10]) {
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x + wx - 1, y + 11, 6, 4);
      ctx.fillStyle = C('slate.3'); ctx.fillRect(x + wx, y + 12, 4, 2);
    }
    // status
    const cx = x + this.w / 2;
    if (riding) {
      const s = 'Autopilot · no manual input', w = textWidth(s, 6.5) + 10;
      pill(ctx, Math.round(cx - w / 2), y - 46, w, 12, 'rgba(7,26,18,0.92)', '#35b779', 3);
      drawText(ctx, s, cx, y - 45, UP, { align: 'center', size: 6.5 });
    } else if (this.mode === 'dock') {
      label(ctx, on ? 'Autopilot ready: step on' : 'Autopilot offline', cx, y - 32, on ? UP : '#8a95b4', 6.5);
    }
    for (const c of this.chips) {
      const a = Math.min(1, c.life / 20);
      ctx.save(); ctx.globalAlpha = a;
      const s = c.buy ? 'Buy' : 'Sell', w = textWidth(s, 6.5) + 14;
      const bx = Math.round(c.x - w / 2 - cam.x), by = Math.round(c.y - cam.y);
      pill(ctx, bx, by, w, 11, c.buy ? '#0e3a27' : '#480e13', c.buy ? '#35b779' : '#e0393f', 3);
      arrow(ctx, bx + 6, by + 4, c.buy, c.buy ? 'green.3' : 'red.3', 3);
      drawText(ctx, s, bx + 10, by + 1, c.buy ? UP : DOWN, { size: 6.5 });
      ctx.restore();
    }
  }
}

// p-trade-2: clean out bad ticks, then slide the feeds into time alignment
class Align {
  constructor(tx, ty, spec, level) {
    this.fact = spec.fact; this.level = level;
    this.rails = spec.rails.map((r) => {
      const o = { x1: (tx + r.dx) * T, y: (ty + r.dy) * T, w: r.w * T, off: r.off * T, phase: r.phase, bad: r.bad, name: r.name, c: r.color };
      o.plat = platform(o.x1 + o.off, o.y, o.w, 6);
      level.platforms.push(o.plat);
      return o;
    });
    const [bx, by, bw, bh] = spec.table;
    this.table = { x: (tx + bx) * T, y: (ty + by) * T, w: bw * T, h: bh * T };
    this.on = level.game.progress.hasFact(this.fact);
    this.t = this.on ? 999 : 0;
    this.update(level, true);
  }
  onFact(id, level) { if (id === this.fact) { this.on = true; this.t = 0; level.sfx('build'); } }
  k(i) { return ease.inOutCubic(clamp((this.t - 34 - i * 16) / 54, 0, 1)); }
  done() { return this.on && this.t > 34 + this.rails.length * 16 + 54; }
  update(level, init) {
    if (this.on && !init) {
      this.t++;
      if (this.t === 30) level.sfx('break');
      if (this.t === 34 + this.rails.length * 16 + 54) level.sfx('checkpoint');
    }
    this.rails.forEach((r, i) => {
      const p = r.plat;
      p.prevX = p.x; p.prevY = p.y;
      p.x = Math.round(lerp(r.x1 + r.off, r.x1, this.on ? this.k(i) : 0));
    });
  }
  draw(ctx, cam, t) {
    const aligned = this.done();
    if (aligned) {
      // shared timestamps: one vertical gridline per tick through every feed
      const top = Math.min(...this.rails.map((r) => r.y)) - 6, bot = Math.max(...this.rails.map((r) => r.y)) + 8;
      const x0 = Math.min(...this.rails.map((r) => r.x1)), x1 = Math.max(...this.rails.map((r) => r.x1 + r.w));
      for (let x = x0; x <= x1; x += 8) for (let y = top; y < bot; y += 3) { ctx.fillStyle = C('#1f7fb0'); ctx.fillRect(x - cam.x, y - cam.y, 1, 1); }
    }
    this.rails.forEach((r, i) => {
      const p = r.plat, x = p.x - cam.x, y = p.y - cam.y, k = this.on ? this.k(i) : 0;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, r.w + 2, 9);
      ctx.fillStyle = C('#0d2440'); ctx.fillRect(x, y, r.w, 7);
      ctx.fillStyle = C(r.c + '.3'); ctx.fillRect(x, y, r.w, 1);
      // timestamps: off-grid until aligned
      const shift = Math.round(r.phase * (1 - k));
      for (let tx2 = shift; tx2 < r.w; tx2 += 8) { ctx.fillStyle = C(r.c + '.2'); ctx.fillRect(x + tx2, y + 2, 1, 4); }
      // bad ticks get cleaned out before alignment
      if (!this.on || this.t < 30) {
        for (const b of r.bad) {
          const bx = x + b * 8 + shift + 3, by = y + 1;
          if ((t >> 3) & 1 || !this.on) {
            ctx.fillStyle = C('red.2');
            for (let j = 0; j < 5; j++) { ctx.fillRect(bx + j, by + j, 1, 1); ctx.fillRect(bx + 4 - j, by + j, 1, 1); }
          }
        }
      }
      drawText(ctx, r.name, x + 2, y - 11, aligned ? '#a8ecff' : '#8a95b4', { size: 6, shadow: INK });
    });
    if (!this.on) {
      const r = this.rails[0];
      label(ctx, 'Feeds out of sync', r.plat.x + r.w / 2 - cam.x, r.y + 14 - cam.y, '#ffe08a', 6.5);
    }
    // the merged dataset, built row by row on the wall
    const tb = this.table, x = tb.x - cam.x, y = tb.y - cam.y;
    if (this.on) {
      const rows = Math.floor((tb.h - 14) / 7);
      const shown = aligned ? rows : Math.floor(rows * clamp((this.t - 60) / 80, 0, 1));
      pill(ctx, x + 3, y, tb.w - 6, tb.h, '#071526', '#1f7fb0', 3);
      drawText(ctx, 'One dataset', x + tb.w / 2, y + 2, '#a8ecff', { align: 'center', size: 6.5 });
      for (let j = 0; j < shown; j++) for (let c2 = 0; c2 < 4; c2++) {
        ctx.fillStyle = C(c2 === 0 ? 'slate.2' : j % 2 ? 'cyan.1' : 'teal.1');
        ctx.fillRect(x + 8 + c2 * ((tb.w - 16) / 4), y + 13 + j * 7, (tb.w - 16) / 4 - 2, 4);
      }
    }
  }
}

// Training Gym floor: a Q-table you explore; cells light as you visit them
class QTable {
  constructor(tx, ty, spec, level) {
    this.x = tx * T; this.y = (ty + 1) * T; this.n = spec.w;
    this.fact = spec.fact; this.level = level;
    this.v = new Array(this.n).fill(0);
    this.t = 0;
  }
  trained() { return this.level.game.progress.hasFact(this.fact); }
  onFact(id, level) { if (id === this.fact) { this.t = 0; level.sfx('build'); } }
  update(level) {
    const h = level.hero;
    if (h.grounded && Math.abs(h.y + h.h - this.y) < 1) {
      const i = Math.floor((h.x + h.w / 2 - this.x) / T);
      if (i >= 0 && i < this.n) this.v[i] = Math.min(1, this.v[i] + 0.04);
    }
    if (this.trained()) {
      this.t++;
      for (let i = 0; i < this.n; i++) {
        const target = 0.45 + 0.55 * (i / (this.n - 1));       // values rise toward the entry signal
        this.v[i] = Math.max(this.v[i], Math.min(target, ((this.t - i * 3) / 40) * target));
      }
    }
  }
  draw(ctx, cam, t) {
    const on = this.trained();
    for (let i = 0; i < this.n; i++) {
      const x = this.x + i * T - cam.x, y = this.y - cam.y, v = this.v[i];
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x, y, T, 6);
      const c = v < 0.05 ? '#1b1f3a' : v < 0.35 ? '#1d4a3c' : v < 0.7 ? '#1d6b43' : '#35b779';
      ctx.fillStyle = C(c); ctx.fillRect(x + 1, y, T - 2, 5);
      if (v >= 0.35) {                                       // the greedy action in this state
        ctx.fillStyle = C(v >= 0.7 ? 'white.2' : 'green.3');
        ctx.fillRect(x + 5, y + 2, 5, 1); ctx.fillRect(x + 9, y + 1, 1, 3); ctx.fillRect(x + 10, y + 2, 1, 1);
      }
    }
    label(ctx, on ? 'Q-table: trained' : 'Q-table: explore it', this.x + 44 - cam.x, this.y - 22 - cam.y, on ? UP : '#c9d1e6', 6.5);
  }
}

// the entry signal: a ▲ plate set into the floor; it launches you once the
// policy is trained
class Spring {
  constructor(tx, ty, spec, level) {
    this.x = tx * T; this.w = spec.w * T; this.y = (ty + 1) * T;
    this.fact = spec.fact; this.level = level; this.squash = 0;
  }
  on() { return this.level.game.progress.hasFact(this.fact); }
  update(level) {
    const h = level.hero, cx = h.x + h.w / 2;
    if (this.on() && h.state === 'normal' && h.grounded && Math.abs(h.y + h.h - this.y) < 1 && cx >= this.x && cx <= this.x + this.w) {
      h.vy = -10.5; h.jumped = false; h.grounded = false; h.ground = null; h.coyote = 0; h.y -= 1;
      this.squash = 10;
      level.sfx('jump');
    }
    if (this.squash > 0) this.squash--;
  }
  draw(ctx, cam, t) {
    const on = this.on(), x = this.x - cam.x, y = this.y - cam.y, sq = this.squash > 0 ? 1 : 0;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 3 + sq, this.w + 2, 7 - sq);
    ctx.fillStyle = C(on ? 'green.1' : 'slate.1'); ctx.fillRect(x, y - 2 + sq, this.w, 5 - sq);
    ctx.fillStyle = C(on ? 'green.3' : 'slate.2'); ctx.fillRect(x, y - 2 + sq, this.w, 1);
    for (let i = 0; i < 3; i++) arrow(ctx, x + 7 + i * 9, y - 1 + sq, true, on ? 'white.2' : 'slate.3', 3);
    // a column of rising chevrons shows where it sends you
    if (on) for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i * 18) % 54);
      arrow(ctx, x + this.w / 2, y - 12 - k, true, k < 40 ? 'green.2' : 'green.1', 3);
    }
    const bob = on ? Math.round(Math.sin(t / 12) * 1.5) : 0;
    label(ctx, on ? 'Entry signal ▲' : 'Entry signal: train first', x + this.w / 2, y - 76 + bob, on ? UP : '#8a95b4', 6.5);
  }
}

// Q-learning and PPO panels on the gym wall; they light up when trained
class Models {
  constructor(tx, ty, spec, level) { this.spec = spec; this.fact = spec.fact; this.level = level; }
  back(ctx, cam, t) {
    const on = this.level.game.progress.hasFact(this.fact);
    const [qx, qy, qw, qh] = this.spec.q, [px2, py, pw, ph] = this.spec.ppo;
    // Q-learning: a grid of state cells with their best action
    let x = qx * T - cam.x, y = qy * T - cam.y;
    pill(ctx, x, y, qw * T, qh * T, '#0c0a24', on ? '#c27a18' : '#2a2650', 3);
    drawText(ctx, 'Q-learning', x + qw * T / 2, y + 2, on ? '#ffe08a' : '#8a95b4', { align: 'center', size: 6.5 });
    const cols = 6, rows = 3, cw = (qw * T - 12) / cols;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cx = x + 6 + i * cw, cy = y + 14 + j * 10;
      ctx.fillStyle = C(on ? (((i + j + (t >> 4)) % 5) ? '#1d6b43' : '#35b779') : '#1b1f3a'); ctx.fillRect(Math.round(cx), cy, Math.round(cw) - 2, 8);
      if (on) arrow(ctx, cx + cw / 2 - 1, cy + 2, (i + j) % 3 === 0, 'white.2', 3);
    }
    // PPO: a small policy network, nodes and weights
    x = px2 * T - cam.x; y = py * T - cam.y;
    pill(ctx, x, y, pw * T, ph * T, '#0c0a24', on ? '#c27a18' : '#2a2650', 3);
    drawText(ctx, 'PPO policy', x + pw * T / 2, y + 2, on ? '#ffe08a' : '#8a95b4', { align: 'center', size: 6.5 });
    const layers = [3, 4, 2], lx = (k) => x + 14 + k * ((pw * T - 28) / 2);
    for (let k = 0; k < 2; k++) for (let a = 0; a < layers[k]; a++) for (let b = 0; b < layers[k + 1]; b++) {
      const ya = y + 16 + a * ((ph * T - 24) / (layers[k] - 1)), yb = y + 16 + b * ((ph * T - 24) / (layers[k + 1] - 1));
      line(ctx, lx(k), ya, lx(k + 1), yb, on ? (((a + b + (t >> 3)) % 4) ? '#2c3570' : '#f2b233') : '#1c2140');
    }
    layers.forEach((n, k) => { for (let a = 0; a < n; a++) {
      const yy = y + 16 + a * ((ph * T - 24) / (n - 1));
      ctx.fillStyle = C('ink.0'); ctx.fillRect(lx(k) - 2, yy - 2, 5, 5);
      ctx.fillStyle = C(on ? 'gold.2' : 'slate.2'); ctx.fillRect(lx(k) - 1, yy - 1, 3, 3);
    } });
  }
}

// candles: hollow up-candles rise under you, filled down-candles sink
class Candles {
  constructor(tx, ty, spec, level) {
    this.cw = spec.w || 24;
    this.list = spec.list.map(([dx, dy, kind, travel, body]) => {
      const c = { x: (tx + dx) * T, y0: (ty + dy) * T, kind, travel, body: body || 26, wait: 0 };
      c.plat = platform(c.x, c.y0, this.cw, 6);
      level.platforms.push(c.plat);
      return c;
    });
    this.level = level;
  }
  update(level) {
    const h = level.hero;
    for (const c of this.list) {
      const on = h.ground === c.plat;
      if (on) c.wait = 30; else if (c.wait > 0) c.wait--;
      const target = on || c.wait > 0 ? c.y0 + (c.kind === 'up' ? -c.travel : c.travel) : c.y0;
      c.plat.prevX = c.plat.x; c.plat.prevY = c.plat.y;
      c.plat.y = approach(c.plat.y, target, on ? 0.6 : 0.3);
    }
  }
  draw(ctx, cam, t) {
    for (const c of this.list) {
      const x = c.x - cam.x, y = Math.round(c.plat.y - cam.y), w = this.cw, b = c.body, mid = x + w / 2;
      const up = c.kind === 'up';
      // wicks
      ctx.fillStyle = C('ink.0'); ctx.fillRect(mid - 2, y + b - 1, 4, 10); ctx.fillRect(mid - 2, y - 5, 4, 6);
      ctx.fillStyle = C(up ? 'green.2' : 'red.2'); ctx.fillRect(mid - 1, y + b, 2, 8); ctx.fillRect(mid - 1, y - 4, 2, 4);
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, w + 2, b + 2);
      if (up) {                                             // hollow body, ▲ inside
        ctx.fillStyle = C('green.2'); ctx.fillRect(x, y, w, b);
        ctx.fillStyle = C('green.3'); ctx.fillRect(x, y, w, 1);
        ctx.fillStyle = C('#0a1a24'); ctx.fillRect(x + 3, y + 3, w - 6, b - 6);
        arrow(ctx, mid, y + b / 2 - 3, true, 'green.3', 6);
      } else {                                              // filled body with hatching, ▼ on it
        ctx.fillStyle = C('red.2'); ctx.fillRect(x, y, w, b);
        ctx.fillStyle = C('red.3'); ctx.fillRect(x, y, w, 1);
        ctx.fillStyle = C('red.1');
        for (let i = -b; i < w; i += 5) for (let j = 2; j < b - 1; j++) { const xx = i + j; if (xx >= 1 && xx < w - 1) ctx.fillRect(x + xx, y + j, 1, 1); }
        arrow(ctx, mid, y + b / 2 - 3, false, 'red.0', 6);
      }
    }
  }
}

// walk-forward: each fold trains on a window, tests on the next, then
// steps forward in time; the folds stack into stairs
class WalkForward {
  constructor(tx, ty, spec, level) {
    this.train = spec.train * T; this.test = spec.test * T;
    this.folds = [];
    for (let k = 0; k < spec.folds; k++) {
      const f = { x: (tx + k * spec.shift) * T, y: ty * T - k * spec.rise };
      f.plat = platform(f.x, f.y, this.train + this.test, 6);
      level.platforms.push(f.plat);
      this.folds.push(f);
    }
  }
  back(ctx, cam) {
    const f0 = this.folds[0];
    label(ctx, 'Walk-forward', f0.x + 20 - cam.x, f0.y - 30 - cam.y, '#a8ecff', 7);
  }
  draw(ctx, cam) {
    for (const f of this.folds) {
      const x = f.x - cam.x, y = f.y - cam.y;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, this.train + this.test + 2, 12);
      ctx.fillStyle = C('indigo.2'); ctx.fillRect(x, y, this.train - 1, 10);
      ctx.fillStyle = C('indigo.3'); ctx.fillRect(x, y, this.train - 1, 1);
      ctx.fillStyle = C('gold.2'); ctx.fillRect(x + this.train, y, this.test, 10);
      ctx.fillStyle = C('gold.3'); ctx.fillRect(x + this.train, y, this.test, 1);
      drawText(ctx, 'Train', x + this.train / 2, y + 1, '#e3e6ee', { align: 'center', size: 6 });
      drawText(ctx, 'Test', x + this.train + this.test / 2, y + 1, '#2a1a05', { align: 'center', size: 6, weight: 700 });
    }
  }
}

// p-trade-4: the backtest board; the figures are parsed from the résumé
class Results {
  constructor(tx, ty, spec, level) {
    this.x = tx * T; this.y = ty * T; this.w = spec.w * T; this.h = spec.h * T;
    this.fact = spec.fact; this.level = level;
    const s = factText(spec.fact);
    const win = /(\d+(?:\.\d+)?)\s*%\s*win rate/i.exec(s), pf = /(\d+(?:\.\d+)?)\s*profit factor/i.exec(s);
    this.stats = [win && [win[1] + '%', 'win rate'], pf && [pf[1], 'profit factor']].filter(Boolean);
    this.t = 0;
  }
  onFact(id) { if (id === this.fact) this.t = 0; }
  update() { this.t++; }
  back(ctx, cam, t) {
    const on = this.level.game.progress.hasFact(this.fact);
    const x = this.x - cam.x, y = this.y - cam.y;
    pill(ctx, x, y, this.w, this.h, '#071526', on ? '#35b779' : '#22356a', 3);
    drawText(ctx, 'Walk-forward backtests', x + this.w / 2, y + 2, on ? '#a8ecff' : '#8a95b4', { align: 'center', size: 6.5 });
    const n = Math.max(1, this.stats.length), cw = this.w / n;
    this.stats.forEach(([big, small], i) => {
      const cx = x + cw * i + cw / 2;
      if (on && this.t > i * 14) {
        drawText(ctx, big, cx, y + 14, '#90eaa8', { align: 'center', size: 13, weight: 700, shadow: INK });
        drawText(ctx, small, cx, y + 34, '#c9d1e6', { align: 'center', size: 6.5 });
      } else {
        drawText(ctx, (t >> 4) & 1 ? '…' : '', cx, y + 18, '#8a95b4', { align: 'center', size: 9 });
        drawText(ctx, small, cx, y + 34, '#4a5068', { align: 'center', size: 6.5 });
      }
    });
  }
}

registerSetpiece('trade.label', Label);
registerSetpiece('trade.banner', PortfolioBanner);
registerSetpiece('trade.autopilot', Autopilot);
registerSetpiece('trade.align', Align);
registerSetpiece('trade.qtable', QTable);
registerSetpiece('trade.spring', Spring);
registerSetpiece('trade.models', Models);
registerSetpiece('trade.candles', Candles);
registerSetpiece('trade.walkforward', WalkForward);
registerSetpiece('trade.results', Results);

// ─── music: a driving minor-key market loop ─────────────────────────

registerSong('trading', {
  bpm: 126,
  lead: steps('E5 G5 B5 . A5 G5 E5 . | D5 . F#5 A5 . F#5 D5 . | C5 E5 G5 . F#5 E5 C5 . | B4 . D#5 F#5 . B5 . . | ' +
    'E5 . B4 . E5 G5 . B5 | A5 . G5 . F#5 . D5 . | C5 . E5 . G5 . C6 . | B5 . A5 . F#5 . D#5 .'),
  bass: steps('E2 . E3 . E2 . E3 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | B1 . B2 . B1 . D#3 . | ' +
    'E2 . E3 . E2 . E3 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | B1 . B2 . B1 . B2 .'),
  drums: steps('k h s h k h s h | k h s h k k s h | k h s h k h s h | k h s s k h s s'),
});

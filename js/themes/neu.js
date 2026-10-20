// NORTHEASTERN · a Boston winter campus at dusk: red-brick sidewalks
// under snow, brick halls with granite cornices and lit windows, falling
// snow. Set pieces: the campus gate, road-work barricades at the digs, a
// streetcar whose roof carries you up to campus, the lecture-hall facade,
// and inside it one floating textbook per course (read from the résumé's
// data-credit list) plus a chalkboard that tallies the credits.

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSkin } from '../art/sprites/actors.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { Hopper } from '../game/enemies.js';
import { Floater } from '../game/objects.js';
import { SOLID } from '../engine/tilemap.js';
import { moveBody } from '../engine/physics.js';
import { registerSong, steps } from '../engine/audio.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { stripedSky, disc, pill, line, mix } from '../art/draw.js';
import { clamp, lerp, rng, hash2, makeCanvas } from '../engine/util.js';

const C = (r) => col(r);
const GROUND = 11;                       // row of the sidewalk top in the main room

function groundRow(map, tx, ty) {
  for (let y = ty; y < map.rows; y++) if (map.flag(tx, y) & SOLID) return y;
  return map.rows;
}
function topRow(map, tx, ty) {
  let r = ty;
  while (r > 0 && map.isTerrain(tx, r - 1)) r--;
  return r;
}
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

const K = {
  snow: col('#f4f7fb'), snow2: col('#dde6f2'), snowLo: col('#aebcd4'), slush: col('#8d93a3'),
  brick: col('#9b4434'), brick2: col('#86392c'), brickHi: col('#b45a44'), mortar: col('#5e2a24'),
  pave: col('#a54a39'), pave2: col('#8a3a2d'), curb: col('#8e939e'), curbLo: col('#5d626d'),
  soil: col('#2c2630'), soil2: col('#221d26'),
  granite: col('#bdb8b2'), graniteLo: col('#8c8781'), lit: col('#ffd27a'), lit2: col('#ffb85c'), frame: col('#e8e2d6'),
  iron: col('#24262f'), ironHi: col('#454956'), ink: C('ink.0'),
};

// ─── kit: brick sidewalks, snowbanks, brick halls ────────────────────

function neuKit() {
  function sidewalk(ctx, x, y, m, tx, ty, d) {
    ctx.fillStyle = K.soil; ctx.fillRect(x, y, 16, 16);
    if (d === 0) {
      // red brick pavers in running bond, a skin of snow on top
      ctx.fillStyle = K.pave; ctx.fillRect(x, y + 3, 16, 6);
      for (let r = 0; r < 2; r++) {
        hline(ctx, x, y + 5 + r * 3, 16, K.mortar);
        const off = (r + tx) % 2 ? 0 : 4;
        for (let i = off; i < 16; i += 8) vline(ctx, x + i, y + 3 + r * 3, 2, K.mortar);
      }
      hline(ctx, x, y + 9, 16, K.curb); hline(ctx, x, y + 10, 16, K.curbLo);
      ctx.fillStyle = K.snow; ctx.fillRect(x, y, 16, 3);
      for (let i = 0; i < 16; i++) if (hash2(tx * 16 + i, ty) < 0.35) px(ctx, x + i, y + 3, K.snow2);
      hline(ctx, x, y + 2, 16, K.snow2);
      for (let i = 0; i < 3; i++) { const h = hash2(tx + i * 7, ty * 3); px(ctx, x + Math.floor(h * 16), y + 12 + i, K.soil2); }
    } else {
      for (let i = 0; i < 3; i++) { const h = hash2(tx * 3 + i, ty * 5); px(ctx, x + Math.floor(h * 16), y + Math.floor(h * 977) % 16, K.soil2); }
    }
    if (!(m & 8)) { vline(ctx, x, y, 16, K.soil2); if (d === 0) vline(ctx, x, y, 3, K.snow2); }
    if (!(m & 2)) { vline(ctx, x + 15, y, 16, K.soil2); if (d === 0) vline(ctx, x + 15, y, 3, K.snowLo); }
  }

  function snowbank(ctx, x, y, m, tx, ty, d) {
    ctx.fillStyle = K.snow; ctx.fillRect(x, y, 16, 16);
    for (let i = 0; i < 5; i++) { const h = hash2(tx * 5 + i, ty * 9); px(ctx, x + 1 + Math.floor(h * 14), y + 3 + Math.floor(h * 97) % 11, K.snow2); }
    if (d === 0) {
      // a lumpy top: each column dips a little, more toward the ends of the pile
      for (let i = 0; i < 16; i++) {
        // (kept shallow: you stand on the tile's top edge)
        const endL = !(m & 8) ? Math.max(0, 4 - (i >> 1)) : 0, endR = !(m & 2) ? Math.max(0, ((i - 7) >> 1)) : 0;
        const dip = Math.round(Math.sin((tx * 16 + i) / 3.1) * 1 + 1) + endL + endR;
        if (dip > 0) ctx.clearRect(x + i, y, 1, dip);
        px(ctx, x + i, y + dip, col('#ffffff'));
      }
    }
    // a pile is wider at the foot: round off the sides above it, shade the right
    if (d > 0 && !(m & 8)) { ctx.clearRect(x, y, 2, 3); ctx.clearRect(x, y, 1, 6); }
    if (d > 0 && !(m & 2)) { ctx.clearRect(x + 14, y, 2, 3); ctx.clearRect(x + 15, y, 1, 6); }
    if (!(m & 2)) { vline(ctx, x + 14, y + (d > 0 ? 6 : 10), d > 0 ? 10 : 6, K.snowLo); vline(ctx, x + 13, y + (d > 0 ? 8 : 12), d > 0 ? 8 : 4, K.snow2); }
    if (ty === GROUND - 1) {
      hline(ctx, x, y + 13, 16, K.snow2);
      for (let i = 0; i < 16; i += 2) px(ctx, x + i + (tx & 1), y + 14 + (i % 4 ? 1 : 0), K.slush);
    }
  }

  function hall(ctx, x, y, m, tx, ty, d, map) {
    ctx.fillStyle = K.brick; ctx.fillRect(x, y, 16, 16);
    for (let r = 0; r < 4; r++) {
      const yy = y + r * 4;
      hline(ctx, x, yy + 3, 16, K.mortar);
      const off = (r + ty * 4) % 2 ? 0 : 4;
      for (let i = off; i < 16; i += 8) vline(ctx, x + i, yy, 3, K.mortar);
      if (hash2(tx * 4 + r, ty) < 0.25) hline(ctx, x + off + 1, yy, 6, K.brickHi);
      if (hash2(ty * 4 + r, tx) < 0.2) hline(ctx, x + ((off + 4) % 8) + 1, yy + 1, 6, K.brick2);
    }
    if (d === 0) {
      // granite cornice, snow along the top, icicles below
      ctx.fillStyle = K.granite; ctx.fillRect(x, y + 3, 16, 4);
      hline(ctx, x, y + 6, 16, K.graniteLo);
      ctx.fillStyle = K.snow; ctx.fillRect(x, y, 16, 3);
      hline(ctx, x, y + 2, 16, K.snow2);
      for (let i = 1; i < 16; i += 3) {
        const len = 1 + Math.floor(hash2(tx * 16 + i, ty) * 3);
        vline(ctx, x + i, y + 7, len, col('#d8ecf8'));
      }
      if ((m & 10) === 10 && hash2(tx * 7, ty) < 0.18) {        // a chimney, drawn up into the empty tile
        ctx.fillStyle = K.brick2; ctx.fillRect(x + 5, y - 8, 6, 8);
        ctx.fillStyle = K.snow; ctx.fillRect(x + 4, y - 9, 8, 2);
      }
    } else if (ty < map.rows - 1 && d % 3 === 1 && tx % 2 === 0) {
      // tall sash window, lit from inside
      ctx.fillStyle = K.granite; ctx.fillRect(x + 3, y + 1, 10, 2);
      ctx.fillStyle = K.frame; ctx.fillRect(x + 4, y + 3, 8, 12);
      ctx.fillStyle = (tx * 3 + ty) % 5 === 0 ? col('#3a3f5c') : K.lit; ctx.fillRect(x + 5, y + 4, 6, 10);
      if ((tx * 3 + ty) % 5) { ctx.fillStyle = K.lit2; ctx.fillRect(x + 5, y + 10, 6, 4); }
      hline(ctx, x + 5, y + 8, 6, K.frame); vline(ctx, x + 7, y + 4, 10, K.frame);
      hline(ctx, x + 3, y + 15, 10, K.snow);
    }
    if (!(m & 8)) { vline(ctx, x, y, 16, K.brick2); vline(ctx, x + 1, y, 16, K.brickHi); }
    if (!(m & 2)) vline(ctx, x + 15, y, 16, K.mortar);
  }

  return {
    terrain(ctx, x, y, m, tx, ty, map) {
      const top = topRow(map, tx, ty);
      if (top >= GROUND) sidewalk(ctx, x, y, m, tx, ty, ty - top);
      else if (top >= GROUND - 2) {
        if (ty < GROUND) snowbank(ctx, x, y, m, tx, ty, ty - top);
        else sidewalk(ctx, x, y, m, tx, ty, ty === GROUND ? 0 : 1);
      } else hall(ctx, x, y, m, tx, ty, ty - top, map);
    },
    // '=' is a black iron fire-escape landing with snow on it
    oneway(ctx, x, y, joinL, joinR) {
      ctx.fillStyle = K.snow; ctx.fillRect(x, y, 16, 2);
      hline(ctx, x, y + 2, 16, K.ironHi);
      ctx.fillStyle = K.iron; ctx.fillRect(x, y + 3, 16, 2);
      for (let i = 1; i < 16; i += 3) px(ctx, x + i, y + 4, K.ironHi);
      for (let i = 0; i < 4; i++) { px(ctx, x + 3 + i, y + 5 + i, K.iron); px(ctx, x + 12 - i, y + 5 + i, K.iron); }
      if (!joinL) vline(ctx, x, y - 6, 9, K.iron);
      if (!joinR) vline(ctx, x + 15, y - 6, 9, K.iron);
      hline(ctx, x, y - 6, 16, K.iron);
    },
    animated() {},
  };
}

// ─── kit: the lecture hall (parquet, wood panelling) ─────────────────

function hallKit() {
  const wood = col('#7a4a2a'), woodHi = col('#a26a3e'), woodLo = col('#55321d'), panel = col('#4a2c1c'), panelHi = col('#6b4128');
  const floor = col('#b07a46'), floor2 = col('#946234'), carpet = col('#8f1d24'), carpetHi = col('#b8323a');
  return {
    terrain(ctx, x, y, m, tx, ty, map) {
      const wall = tx === 0 || tx === map.cols - 1 || ty === 0;
      if (wall) {
        ctx.fillStyle = panel; ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = panelHi; ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = panel; ctx.fillRect(x + 3, y + 3, 10, 10);
        return;
      }
      const top = !(m & 1);
      if (top && ty >= map.rows - 3) {              // the hall floor: herringbone parquet
        ctx.fillStyle = floor; ctx.fillRect(x, y, 16, 16);
        for (let i = 0; i < 16; i += 4) for (let j = 0; j < 4; j++) {
          const k = ((i / 4 + j + tx) & 1);
          ctx.fillStyle = k ? floor2 : floor; ctx.fillRect(x + i, y + 1 + j * 2, 4, 2);
        }
        hline(ctx, x, y, 16, woodHi);
        hline(ctx, x, y + 9, 16, woodLo);
        ctx.fillStyle = woodLo; ctx.fillRect(x, y + 10, 16, 6);
      } else if (top) {                             // a tier of the hall: carpet on a wood riser
        ctx.fillStyle = wood; ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = carpet; ctx.fillRect(x, y, 16, 4);
        hline(ctx, x, y, 16, carpetHi);
        hline(ctx, x, y + 4, 16, woodLo);
        vline(ctx, x + 7, y + 6, 10, woodLo);
      } else {
        ctx.fillStyle = wood; ctx.fillRect(x, y, 16, 16);
        hline(ctx, x, y + 15, 16, woodLo);
        vline(ctx, x + 7, y, 16, woodLo);
        if (ty >= map.rows - 3) { ctx.fillStyle = woodLo; ctx.fillRect(x, y, 16, 16); }
      }
      if (!(m & 8)) { vline(ctx, x, y, 16, woodHi); }
      if (!(m & 2)) vline(ctx, x + 15, y, 16, woodLo);
    },
    oneway(ctx, x, y) { hline(ctx, x, y, 16, woodHi); ctx.fillStyle = wood; ctx.fillRect(x, y + 1, 16, 3); hline(ctx, x, y + 4, 16, woodLo); },
    animated() {},
  };
}

registerKit('neu', neuKit());
registerKit('neuHall', hallKit());

// ─── backdrop: Boston at dusk in the snow ────────────────────────────

function flakes(seed, n, w) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * w, y: r() * H, s: 0.2 + r() * 0.35, p: r() * 6.28, big: r() < 0.25 }));
}

function neuBackdrop(W) {
  const sky = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#141a36', '#1f2750', '#323d6c', '#4f5584', '#7a7097', '#a891a8', '#d0b3b3']);
  });

  const skyline = strip(720, (ctx, w) => {
    const r = rng(8);
    const body = col('#3b4269'), edge = col('#4a527c'), win = col('#d9c58a');
    let x = 0;
    while (x < w) {
      const bw = 16 + Math.floor(r() * 30), bh = 26 + Math.floor(r() * 40);
      const top = H - 64 - bh;
      ctx.fillStyle = body; ctx.fillRect(x, top, bw, H - top);
      ctx.fillStyle = edge; ctx.fillRect(x, top, bw, 1);
      for (let wy = top + 4; wy < H - 66; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (r() < 0.12) { ctx.fillStyle = win; ctx.fillRect(wx, wy, 1, 1); }
      if (r() < 0.2) { ctx.fillStyle = body; ctx.fillRect(x + bw / 2 - 1, top - 12, 2, 12); ctx.fillStyle = col('#ff8f7f'); ctx.fillRect(x + bw / 2 - 1, top - 13, 2, 1); }
      x += bw + Math.floor(r() * 8);
    }
  });

  const rows = strip(800, (ctx, w) => {
    // brownstone rows and brick halls with lit windows, snow on every ledge
    const r = rng(29);
    const base = H - 40;
    let x = 0;
    while (x < w) {
      const bw = 34 + Math.floor(r() * 30), bh = 36 + Math.floor(r() * 26);
      const top = base - bh;
      const tone = r() < 0.5 ? ['#6e3a33', '#5b2f2a'] : ['#5a3a36', '#4a2f2c'];
      ctx.fillStyle = col(tone[0]); ctx.fillRect(x, top, bw, H - top);
      ctx.fillStyle = col(tone[1]); ctx.fillRect(x + bw - 4, top, 4, H - top);
      ctx.fillStyle = col('#9a948e'); ctx.fillRect(x - 1, top, bw + 2, 3);
      ctx.fillStyle = col('#eef3fa'); ctx.fillRect(x - 1, top - 2, bw + 2, 2);
      for (let wy = top + 7; wy < base - 8; wy += 11) {
        for (let wx = x + 4; wx < x + bw - 8; wx += 8) {
          const on = r() < 0.55;
          ctx.fillStyle = col(on ? '#ffcf70' : '#2b2e45'); ctx.fillRect(wx, wy, 4, 6);
          ctx.fillStyle = col('#eef3fa'); ctx.fillRect(wx - 1, wy + 6, 6, 1);
        }
      }
      if (r() < 0.5) {                                  // a stoop
        ctx.fillStyle = col('#4a2f2c'); for (let i = 0; i < 4; i++) ctx.fillRect(x + 6 - i, base - 4 + i, 10 + i * 2, 1);
      }
      x += bw + 1;
    }
  });

  const near = strip(560, (ctx, w) => {
    const r = rng(77);
    // bare trees
    for (let x = 30; x < w - 20; x += 110 + Math.floor(r() * 60)) {
      const base = H - 44;
      ctx.fillStyle = col('#1d1e2e'); ctx.fillRect(x, base - 46, 3, 46);
      const branch = (x0, y0, a, len, depth) => {
        if (depth === 0) return;
        const x1 = x0 + Math.cos(a) * len, y1 = y0 - Math.sin(a) * len;
        line(ctx, x0, y0, x1, y1, '#1d1e2e');
        branch(x1, y1, a + 0.45, len * 0.68, depth - 1);
        branch(x1, y1, a - 0.5, len * 0.66, depth - 1);
      };
      branch(x + 1, base - 40, Math.PI / 2 + 0.5, 16, 4);
      branch(x + 1, base - 44, Math.PI / 2 - 0.4, 18, 4);
    }
    // iron lamp posts
    for (let x = 80; x < w; x += 150) {
      ctx.fillStyle = col('#1d1e2e'); ctx.fillRect(x, H - 92, 2, 48);
      ctx.fillStyle = col('#1d1e2e'); ctx.fillRect(x - 3, H - 100, 8, 2); ctx.fillRect(x - 2, H - 98, 6, 6);
      ctx.fillStyle = col('#ffe3a0'); ctx.fillRect(x - 1, H - 97, 4, 4);
    }
    // a low snowbank along the far side, then the drop into shadow
    ctx.fillStyle = col('#c9d3e6'); ctx.fillRect(0, H - 48, w, 4);
    for (let x = 0; x < w; x += 9) { ctx.fillStyle = col('#e3eaf5'); ctx.fillRect(x + 2, H - 49, 5, 1); }
    for (let y = H - 44; y < H; y++) { ctx.fillStyle = mix(['#3a3f5e', '#1c1a2a', '#110f1a'], (y - (H - 44)) / 44); ctx.fillRect(0, y, w, 1); }
  });

  const far = flakes(3, 70, 1024), close = flakes(5, 26, 1024);
  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, skyline, camX, 0.06 * k, -camY * 0.1);
      drawFlakes(ctx, far, camX * 0.1 * k, t * k, 1, '#c9d3e6');
      blitStrip(ctx, rows, camX, 0.2 * k, -camY * 0.2);
      blitStrip(ctx, near, camX, 0.45 * k, -camY * 0.4);
      ctx.fillStyle = col('#110f1a'); ctx.fillRect(0, H - 4, ctx.W, 4);      // the strip rides up a few px with the camera
      drawFlakes(ctx, close, camX * 0.5 * k, t * k, 2, '#eef3fa');
    },
  };
}

function drawFlakes(ctx, list, ox, t, size, c) {
  ctx.fillStyle = c;
  for (const f of list) {
    const y = (f.y + t * f.s) % (H + 8) - 4;
    const x = ((f.x - ox + Math.sin(t / 50 + f.p) * 6) % 1024 + 1024) % 1024;
    if (x > ctx.W) continue;
    ctx.fillRect(Math.round(x), Math.round(y), f.big ? size : 1, f.big ? size : 1);
  }
}

// ─── backdrop: the lecture hall (wood, tall windows, tiered seats) ───

function hallBackdrop() {
  const [c, ctx] = makeCanvas(480, 224);
  stripedSky(ctx, 480, 224, ['#e9dcc4', '#dccdb2', '#cdbb9d']);
  // tall arched windows with the snowy night outside
  for (const wx of [176, 264, 352]) {
    ctx.fillStyle = col('#8a6a4a'); ctx.fillRect(wx - 3, 26, 46, 72);
    ctx.fillStyle = col('#1f2750'); ctx.fillRect(wx, 32, 40, 64);
    disc(ctx, wx + 20, 34, 20, '#8a6a4a'); disc(ctx, wx + 20, 36, 17, '#1f2750');
    ctx.fillStyle = col('#1f2750'); ctx.fillRect(wx + 3, 36, 34, 4);
    ctx.fillStyle = col('#8a6a4a'); ctx.fillRect(wx + 19, 20, 2, 76); ctx.fillRect(wx, 62, 40, 2);
    const r = rng(wx);
    for (let i = 0; i < 26; i++) { ctx.fillStyle = col('#c9d3e6'); ctx.fillRect(wx + 1 + Math.floor(r() * 38), 26 + Math.floor(r() * 68), 1, 1); }
    ctx.fillStyle = col('#3a4268'); ctx.fillRect(wx, 88, 40, 8);
  }
  // wood wainscot
  ctx.fillStyle = col('#6b4128'); ctx.fillRect(0, 112, 480, 64);
  ctx.fillStyle = col('#7a4a2a'); for (let x = 8; x < 480; x += 40) ctx.fillRect(x, 120, 32, 48);
  ctx.fillStyle = col('#a26a3e'); ctx.fillRect(0, 110, 480, 3);
  // tiered seats rising toward the back of the hall (right)
  for (let row = 0; row < 7; row++) {
    const y = 168 - row * 10, x0 = 128 + row * 30;
    ctx.fillStyle = col('#55321d'); ctx.fillRect(x0, y, 480 - x0, 10);
    for (let x = x0 + 2; x < 470; x += 9) {
      ctx.fillStyle = col('#8f1d24'); ctx.fillRect(x, y - 6, 7, 6);
      ctx.fillStyle = col('#b8323a'); ctx.fillRect(x, y - 6, 7, 1);
    }
  }
  // pendant lights
  for (const lx of [96, 220, 344]) {
    ctx.fillStyle = col('#3d2a1c'); ctx.fillRect(lx, 16, 1, 14);
    ctx.fillStyle = col('#ffe3a0'); ctx.fillRect(lx - 4, 30, 9, 3);
    ctx.fillStyle = 'rgba(255, 227, 160, 0.10)';
    ctx.beginPath(); ctx.moveTo(lx - 4, 33); ctx.lineTo(lx + 5, 33); ctx.lineTo(lx + 30, 110); ctx.lineTo(lx - 30, 110); ctx.fill();
  }
  return { draw(ctx2, camX, camY) { ctx2.fillStyle = col('#05060c'); ctx2.fillRect(0, 0, ctx2.W, H); ctx2.drawImage(c, -camX, -camY); } };
}

registerBackground('neu', neuBackdrop);
registerBackground('neuHall', hallBackdrop);

// ─── bugs: a red campus beetle, and the deadline alarm clock ─────────

registerSkin('neu', { d: 'red.1', b: 'red.2', c: 'red.3', t: 'white.2', e: 'white.2', o: 'ink.0', l: 'slate.3' });

// rings (shakes, bells rattling) before it hops toward you, but keeps to
// its own stretch of sidewalk so it never follows you to a stop or a dig
class Deadline extends Hopper {
  constructor(tx, ty, leash = 2) { super(tx, ty); this.leash = leash * TILE; }
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
        let dir = Math.sign(hx - (this.x + 6)) || 1;
        if (Math.abs(this.x + dir * 28 - this.spawnX) > this.leash) dir = -dir;
        this.vx = dir * 0.9;
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
    const cx = x + 6, cy = y + 7;
    if (this.flat) {
      rect(ctx, x - 1, y + 8, 14, 4, K.ink); rect(ctx, x, y + 9, 12, 2, C('red.2'));
      rect(ctx, x + 3, y + 7, 6, 2, C('white.2'));
      rect(ctx, x + 10, y + 5, 1, 3, C('gold.2')); rect(ctx, x + 11, y + 4, 1, 1, C('gold.2'));
      return;
    }
    const ringing = this.grounded && this.wait < 22;
    const sh = ringing ? ((t >> 1) & 1) * 2 - 1 : 0;
    // bells and hammer
    for (const s of [-1, 1]) {
      disc(ctx, cx + s * 4 + (s < 0 ? sh : -sh), cy - 6, 2, 'ink.0');
      disc(ctx, cx + s * 4 + (s < 0 ? sh : -sh), cy - 6, 1, 'gold.3');
    }
    rect(ctx, cx - 1, cy - 8, 2, 2, K.ink);
    // body and face
    disc(ctx, cx + sh, cy, 6, 'ink.0');
    disc(ctx, cx + sh, cy, 5, 'red.2');
    disc(ctx, cx + sh, cy, 3, 'white.2');
    rect(ctx, cx - 3 + sh, cy - 3, 1, 1, C('red.3'));
    // hands at one minute to midnight
    rect(ctx, cx + sh, cy - 3, 1, 3, K.ink);
    rect(ctx, cx - 1 + sh, cy - 2, 1, 2, K.ink);
    rect(ctx, cx + sh, cy, 1, 1, C('red.1'));
    // feet
    rect(ctx, cx - 4 + sh, cy + 5, 2, 2, K.ink); rect(ctx, cx + 3 + sh, cy + 5, 2, 2, K.ink);
    if (ringing && ((t >> 2) & 1)) {
      for (const s of [-1, 1]) { rect(ctx, cx + s * 9, cy - 8, 1, 2, C('white.2')); rect(ctx, cx + s * 10, cy - 5, 1, 2, C('white.2')); }
    }
  }
}

registerSetpiece('neuDeadline', class { constructor(tx, ty, spec, level) { level.enemies.push(new Deadline(tx, ty, spec.leash)); } });

// ─── the campus gate: brick pillars, an iron arch, the nameplate ─────

registerSetpiece('neuGate', class {
  constructor(tx, ty, spec, level) {
    this.cx = tx * TILE + 8; this.y = ty * TILE;
    this.ground = groundRow(level.map, tx, ty) * TILE;
    this.title = spec.title; this.sub = spec.sub;
  }
  back(ctx, cam, t) {
    const tw = Math.max(textWidth(this.title, 8.5, 700), textWidth(this.sub || '', 7)) + 18;
    const w = Math.ceil(tw) + 44;
    const x = Math.round(this.cx - w / 2 - cam.x), y = this.y - cam.y, g = this.ground - cam.y;
    // pillars
    for (const px0 of [x, x + w - 18]) {
      rect(ctx, px0 - 1, y - 1, 20, g - y + 1, K.ink);
      rect(ctx, px0, y, 18, g - y, K.brick);
      for (let yy = y + 3; yy < g; yy += 4) { rect(ctx, px0, yy, 18, 1, K.mortar); rect(ctx, px0 + ((yy / 4) % 2 ? 4 : 9), yy - 3, 1, 3, K.mortar); }
      rect(ctx, px0 + 15, y, 3, g - y, K.brick2);
      rect(ctx, px0 - 2, y - 4, 22, 4, K.granite); rect(ctx, px0 - 2, y - 5, 22, 1, K.snow);
      // lantern
      rect(ctx, px0 + 6, y - 14, 6, 9, K.iron); rect(ctx, px0 + 7, y - 13, 4, 6, K.lit);
      rect(ctx, px0 + 5, y - 15, 8, 1, K.iron); rect(ctx, px0 + 5, y - 16, 8, 1, K.snow);
    }
    // iron arch
    const ax0 = x + 18, ax1 = x + w - 18, cx = (ax0 + ax1) / 2, rx = (ax1 - ax0) / 2;
    for (let i = 0; i <= rx * 2; i++) {
      const u = (i - rx) / rx;
      const yy = y + 4 - Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * 16);
      rect(ctx, ax0 + i, yy, 1, 2, K.iron);
      if (i % 8 === 0) rect(ctx, ax0 + i, yy + 2, 1, y + 6 - yy, K.ironHi);
    }
    rect(ctx, ax0, y + 4, ax1 - ax0, 2, K.iron);
    // nameplate hung under the arch
    const ph = lineHeight(8.5) + (this.sub ? lineHeight(7) : 0) + 8;
    pill(ctx, cx - tw / 2, y + 8, tw, ph, '#2b1d1a', '#0b0d17', 2);
    rect(ctx, cx - tw / 2 + 2, y + 10, tw - 4, 1, C('gold.1'));
    drawText(ctx, this.title, cx, y + 12, '#f5f1e6', { align: 'center', size: 8.5, weight: 700 });
    if (this.sub) drawText(ctx, this.sub, cx, y + 12 + lineHeight(8.5), '#ffd166', { align: 'center', size: 7 });
  }
});

// ─── road work: striped barricades with a blinking lamp ──────────────

registerSetpiece('neuBarrier', class {
  constructor(tx, ty, spec, level) { this.x = tx * TILE; this.ground = groundRow(level.map, tx, ty) * TILE; this.ph = tx; }
  back(ctx, cam, t) {
    const x = this.x - cam.x, g = this.ground - cam.y;
    if (x < -16 || x > ctx.W) return;
    rect(ctx, x + 2, g - 14, 2, 14, K.iron); rect(ctx, x + 12, g - 14, 2, 14, K.iron);
    rect(ctx, x, g - 14, 16, 6, K.ink);
    for (let i = 0; i < 16; i += 4) rect(ctx, x + 1 + i, g - 13, 2, 4, C('orange.2'));
    for (let i = 2; i < 16; i += 4) rect(ctx, x + 1 + i, g - 13, 2, 4, C('white.2'));
    rect(ctx, x, g - 15, 16, 1, K.snow);
    const on = ((t + this.ph * 13) >> 4) & 1;
    rect(ctx, x + 6, g - 19, 4, 4, K.ink); rect(ctx, x + 7, g - 18, 2, 2, on ? C('gold.3') : C('gold.1'));
  }
});

// ─── the streetcar: shuttles between two stops; ride its roof ────────

registerSetpiece('neuStreetcar', class {
  constructor(tx, ty, spec, level) {
    this.ground = groundRow(level.map, tx, ty) * TILE;
    this.w = 80; this.h = 48;
    this.x0 = tx * TILE; this.x1 = (tx + spec.len) * TILE;
    this.x = this.x0; this.dir = 1;
    this.dwell = spec.dwell || [120, 70];          // frames at the stop, at campus
    this.wait = this.dwell[0];
    this.dest = spec.dest;
    this.plat = platform(this.x + 3, this.ground - this.h, this.w - 6, 6);
    level.platforms.push(this.plat);
  }
  update() {
    const p = this.plat;
    p.prevX = p.x; p.prevY = p.y;
    if (this.wait > 0) { this.wait--; return; }
    // ease out of and into each stop
    const edge = Math.min(this.x - this.x0, this.x1 - this.x);
    const v = 1.25 * clamp(edge / 32 + 0.1, 0.1, 1);
    this.x += this.dir * v;
    if (this.x >= this.x1) { this.x = this.x1; this.dir = -1; this.wait = this.dwell[1]; }
    else if (this.x <= this.x0) { this.x = this.x0; this.dir = 1; this.wait = this.dwell[0]; }
    p.x = this.x + 3;
  }
  back(ctx, cam, t) {
    const gx = -cam.x, g = this.ground - cam.y, roof = g - this.h;
    // overhead wire along the whole run
    rect(ctx, this.x0 - 48 + gx, roof - 17, this.x1 - this.x0 + this.w + 96, 1, col('#1d1e2e'));
    for (let px0 = this.x0 - 40; px0 < this.x1 + this.w + 48; px0 += 96) rect(ctx, px0 + gx, roof - 17, 1, 3, col('#1d1e2e'));
    // rails
    rect(ctx, this.x0 - 40 + gx, g - 2, this.x1 - this.x0 + this.w + 80, 1, col('#5d626d'));
    const x = Math.round(this.x - cam.x);
    if (x > ctx.W + 8 || x + this.w < -8) return;
    const w = this.w;
    // pantograph up to the wire
    line(ctx, x + 30, roof, x + 36, roof - 9, '#1d1e2e'); line(ctx, x + 36, roof - 9, x + 30, roof - 16, '#1d1e2e');
    line(ctx, x + 42, roof, x + 36, roof - 9, '#1d1e2e');
    rect(ctx, x + 26, roof - 17, 10, 1, col('#45495a'));
    // body
    rect(ctx, x - 1, roof - 1, w + 2, this.h - 3, K.ink);
    rect(ctx, x + 1, roof, w - 2, 6, col('#c8cdd6'));                // roof
    rect(ctx, x + 1, roof, w - 2, 2, K.snow);
    rect(ctx, x, roof + 6, w, 14, col('#262a3a'));                   // window band
    for (let i = 0; i < 7; i++) {
      const wx = x + 4 + i * 11;
      rect(ctx, wx, roof + 8, 8, 10, col('#ffd27a'));
      rect(ctx, wx, roof + 14, 8, 4, col('#ffb85c'));
      rect(ctx, wx, roof + 8, 2, 2, col('#fff3cf'));
    }
    rect(ctx, x, roof + 20, w, 18, col('#2f7a4a'));                  // lower body
    rect(ctx, x, roof + 22, w, 2, col('#e8e2d6'));
    rect(ctx, x, roof + 20, w, 1, col('#4f9a66'));
    rect(ctx, x + w / 2 - 7, roof + 25, 14, 13, col('#246039'));     // doors
    rect(ctx, x + w / 2, roof + 25, 1, 13, K.ink);
    rect(ctx, x, roof + 38, w, 4, col('#3b3f4c'));                   // skirt
    for (const bx of [x + 10, x + w - 26]) {                         // bogies
      rect(ctx, bx, roof + 42, 16, 4, col('#1d1e2e'));
      disc(ctx, bx + 4, roof + 45, 2, '#45495a'); disc(ctx, bx + 12, roof + 45, 2, '#45495a');
    }
    // lamps on both ends, the destination sign up front
    const front = this.dir > 0 ? x + w - 3 : x + 1;
    rect(ctx, front, roof + 30, 2, 3, col('#fff3cf'));
    rect(ctx, this.dir > 0 ? x + 1 : x + w - 3, roof + 30, 2, 3, C('red.2'));
    const sw = Math.ceil(textWidth(this.dest, 5.5)) + 6;
    const sx = this.dir > 0 ? x + w - sw - 3 : x + 3;
    rect(ctx, sx, roof + 7, sw, lineHeight(5.5) + 1, col('#0b0d17'));
    drawText(ctx, this.dest, sx + sw / 2, roof + 7, '#ffb347', { align: 'center', size: 5.5, weight: 700 });
  }
});

// ─── the stop: a raised platform with a shelter ──────────────────────

registerSetpiece('neuStop', class {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.w = spec.w * TILE;
    this.top = groundRow(level.map, tx, ty) * TILE;
    this.street = groundRow(level.map, tx - 1, ty) * TILE;
  }
  back(ctx, cam) {
    const x = this.x - cam.x, top = this.top - cam.y;
    // glass shelter with a lit poster panel
    const steel = col('#9aa0ad'), steelLo = col('#5d626d');
    rect(ctx, x + 6, top - 42, 46, 3, steelLo); rect(ctx, x + 6, top - 44, 46, 2, K.snow);
    for (const px0 of [x + 7, x + 29, x + 50]) { rect(ctx, px0, top - 39, 2, 39, steel); rect(ctx, px0 + 1, top - 39, 1, 39, steelLo); }
    ctx.fillStyle = 'rgba(190, 220, 240, 0.30)'; ctx.fillRect(x + 9, top - 39, 41, 26);
    rect(ctx, x + 31, top - 36, 17, 22, col('#ffe9b8')); rect(ctx, x + 33, top - 34, 13, 8, C('teal.2')); rect(ctx, x + 33, top - 24, 9, 1, col('#8a6a4a')); rect(ctx, x + 33, top - 21, 11, 1, col('#8a6a4a'));
    rect(ctx, x + 10, top - 12, 18, 2, col('#6b4128')); rect(ctx, x + 11, top - 10, 1, 10, steelLo); rect(ctx, x + 26, top - 10, 1, 10, steelLo);
    // sign pole with a streetcar pictogram
    const sx = x + this.w - 12;
    rect(ctx, sx, top - 52, 2, 52, col('#9aa0ad'));
    disc(ctx, sx + 1, top - 56, 7, 'ink.0'); disc(ctx, sx + 1, top - 56, 6, 'white.2');
    rect(ctx, sx - 3, top - 60, 9, 6, C('green.2')); rect(ctx, sx - 2, top - 59, 7, 2, C('white.2'));
    rect(ctx, sx - 3, top - 53, 2, 1, K.ink); rect(ctx, sx + 4, top - 53, 2, 1, K.ink);
  }
  draw(ctx, cam) {
    const x = this.x - cam.x, top = this.top - cam.y, h = this.street - this.top;
    rect(ctx, x, top, this.w, h, col('#a7abb4'));
    rect(ctx, x, top, this.w, 3, K.snow);
    rect(ctx, x, top + 3, this.w, 2, C('gold.2'));                  // tactile edge
    for (let i = 1; i < this.w; i += 3) rect(ctx, x + i, top + 3, 1, 1, C('gold.1'));
    rect(ctx, x, top + h - 2, this.w, 2, col('#7d818b'));
    rect(ctx, x, top, 1, h, K.ink); rect(ctx, x + this.w - 1, top, 1, h, K.ink);
  }
});

// ─── the lecture hall seen from outside ──────────────────────────────

registerSetpiece('neuFacade', class {
  constructor(tx, ty, spec, level) {
    this.x = (tx + 1) * TILE; this.w = spec.w * TILE;
    this.ground = groundRow(level.map, tx, ty) * TILE;
    this.title = spec.title;
  }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, w = this.w, g = this.ground - cam.y, top = -cam.y;
    if (x > ctx.W || x + w < 0) return;
    // limestone front with columns over the brick
    rect(ctx, x, top + 30, w, g - top - 30, col('#d9d2c4'));
    rect(ctx, x, top + 30, w, 2, K.snow);
    rect(ctx, x, top + 32, w, 3, col('#b9b1a2'));
    const fh = lineHeight(8) + 8;
    rect(ctx, x + 4, top + 38, w - 8, fh, col('#c7bfae'));
    drawText(ctx, this.title, x + w / 2, top + 42, '#4a3a2a', { align: 'center', size: 8, weight: 700 });
    for (let i = 10; i < w - 6; i += 20) {
      rect(ctx, x + i, top + 40 + fh, 8, g - top - 52 - fh, col('#ece6da'));
      rect(ctx, x + i + 6, top + 40 + fh, 2, g - top - 52 - fh, col('#bdb4a3'));
      rect(ctx, x + i - 2, top + 38 + fh, 12, 3, col('#c7bfae'));
    }
    // tall windows between the columns, lit
    for (let i = 20; i < w - 14; i += 20) {
      rect(ctx, x + i, top + 60 + fh, 8, 40, col('#5a4632'));
      rect(ctx, x + i + 1, top + 61 + fh, 6, 38, K.lit);
      rect(ctx, x + i + 1, top + 80 + fh, 6, 1, col('#5a4632'));
    }
    // steps and doors at the foot
    rect(ctx, x, g - 12, w, 12, col('#b9b1a2'));
    for (let i = 0; i < 3; i++) rect(ctx, x, g - 12 + i * 4, w, 1, col('#ece6da'));
    rect(ctx, x, g - 1, w, 1, K.snow);
    rect(ctx, x, top + 30, 1, g - top - 30, K.ink);
    // the walk runs on in front of it
    rect(ctx, x, g, w, H + 8 - g, K.soil);
    rect(ctx, x, g, w, 3, K.snow); rect(ctx, x, g + 3, w, 6, K.pave);
    rect(ctx, x, g + 5, w, 1, K.mortar); rect(ctx, x, g + 8, w, 1, K.mortar);
    rect(ctx, x, g + 9, w, 1, K.curb); rect(ctx, x, g + 10, w, 1, K.curbLo);
  }
});

// ─── falling snow in front of the tiles ──────────────────────────────

registerSetpiece('neuSnow', class {
  constructor(tx, ty, spec, level) { this.level = level; this.f = flakes(11, spec.n || 30, 1024); }
  draw(ctx, cam, t) {
    if (this.level.game.reduced) return;
    drawFlakes(ctx, this.f, cam.x * 1.1, t * 1.6, 2, '#ffffff');
  }
});

// ─── textbooks: one per course in the résumé's data-credit list ──────

const GLYPHS = [
  [/object|oop/i, ['.xx.xx.', '.x...x.', 'x.....x', '.x...x.', '.xx.xx.']],      // { }
  [/data struct|algorithm/i, ['...x...', '..x.x..', '.x...x.', 'x.x.x.x', '.......']], // a tree
  [/discrete/i, ['x.....x', '.x...x.', '.xxxxx.', '..x.x..', '...x...']],          // ∀
  [/engineer|cornerstone/i, ['..x.x..', '.xxxxx.', 'xxx.xxx', '.xxxxx.', '..x.x..']], // a gear
  [/calc/i, ['....xx.', '...x...', '...x...', '...x...', '.xx....']],              // ∫
  [/physic/i, ['..xxx..', '.x.x.x.', 'x.xxx.x', '.x.x.x.', '..xxx..']],            // an atom
  [/chem/i, ['..xxx..', '...x...', '..x.x..', '.x...x.', 'xxxxxxx']],              // a flask
];
const PAGE = ['xxxxx..', '.......', 'xxxx...', '.......', 'xxxxx..'];
const glyphFor = (name) => (GLYPHS.find(([re]) => re.test(name)) || [null, PAGE])[1];
const COVERS = ['red', 'indigo', 'green', 'gold', 'teal', 'magenta', 'orange', 'cyan'];

function glyph(ctx, g, x, y, c, k = 1) {
  ctx.fillStyle = c;
  g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'x') ctx.fillRect(x + i * k, y + j * k, k, k); });
}
const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Books form a staircase from the floor to the exit ledge. However many
// courses the résumé lists, the climb is evenly split between them.
registerSetpiece('neuBooks', class {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.fact = level.room.facts.books[0];
    const names = level.game.content.credits.length ? level.game.content.credits : ['Coursework'];
    const [x0, x1] = spec.span, [y0, y1] = spec.rise;       // px: floor run and floor → ledge heights
    const n = names.length, pitch = (x1 - x0) / n, bw = Math.round(Math.min(28, pitch - 10));
    this.bw = bw;
    this.books = names.map((name, i) => {
      const cx = x0 + (i + 0.5) * pitch;
      const top = Math.round(y0 - ((i + 1) * (y0 - y1)) / (n + 1));
      const p = platform(Math.round(cx - bw / 2), top, bw, 4);
      level.platforms.push(p);
      return { name, p, top, cx, i, glyph: glyphFor(name), cover: COVERS[i % COVERS.length], done: level.state.built.has('credit:' + name), flash: 0 };
    });
    this.allDone = this.books.every((b) => b.done);
    this.t = 0;
  }
  get earned() { return this.books.filter((b) => b.done).length; }
  update(level) {
    this.t++;
    const h = level.hero;
    for (const b of this.books) {
      b.p.prevY = b.p.y;
      b.p.y = b.top + (Math.round(Math.sin((this.t + b.i * 25) / 40)) > 0 ? 1 : 0);
      if (b.flash > 0) b.flash--;
      if (!b.done && h.ground === b.p && h.state === 'normal') this.earn(b, level);
    }
  }
  earn(b, level) {
    b.done = true; b.flash = 100;
    level.state.built.add('credit:' + b.name);
    const g = level.game;
    const first = !g.progress.hasFact(this.fact);
    if (first) level.discover(this.fact, b.cx, b.top - 6);
    else {
      level.sfx('bit');
      g.toast('+1 credit: <b>' + esc(b.name) + '</b>');
      level.floaters.push(new Floater(b.cx, b.top - 14, '+1 credit', '#ffd166', 50));
    }
    if (!this.allDone && this.books.every((x) => x.done)) {
      this.allDone = true;
      level.after(first ? 40 : 20, () => {
        g.progress.lives = Math.min(9, g.progress.lives + 1);
        g.ui.hud.refresh(true);
        level.sfx('oneup');
        level.floaters.push(new Floater(level.hero.x + 5, level.hero.y - 10, 'All credits · 1-up!', '#90eaa8', 90));
      });
    }
  }
  draw(ctx, cam, t) {
    const h = this.level.hero;
    let near = null, best = 44;
    for (const b of this.books) {
      const x = Math.round(b.p.x - cam.x), y = Math.round(b.p.y - cam.y), w = this.bw;
      const c1 = C(b.cover + '.1'), c2 = C(b.cover + '.2'), c3 = C(b.cover + '.3');
      // a hardback lying flat, spine toward you
      rect(ctx, x - 1, y - 1, w + 2, 11, K.ink);
      rect(ctx, x, y, w, 9, c2);
      rect(ctx, x, y, w, 1, c3);
      rect(ctx, x, y + 8, w, 1, c1);
      rect(ctx, x + 2, y + 1, 1, 7, C('gold.2')); rect(ctx, x + w - 3, y + 1, 1, 7, C('gold.2'));
      glyph(ctx, b.glyph, x + Math.floor(w / 2) - 3, y + 2, b.done ? col('#ffe08a') : col('#f5f1e6'));
      if (b.done && b.flash > 0 && ((b.flash >> 2) & 1)) rect(ctx, x, y - 3, w, 1, col('#ffe08a'));
      const d = Math.abs(h.x + h.w / 2 - b.cx) + (h.ground === b.p ? -100 : 0);
      if (d < best && d < w / 2 + 6) { best = d; near = b; }
    }
    // the book you're at says which course it is, above your head
    // (not while its "+1 credit" is floating up through the same spot)
    if (near && near.flash < 30) {
      const label = near.name;
      const tw = Math.ceil(textWidth(label, 6.5)) + 10, x = Math.round(near.cx - cam.x - tw / 2), y = Math.round(near.top - cam.y - 36);
      pill(ctx, Math.max(4, Math.min(ctx.W - tw - 4, x)), y, tw, lineHeight(6.5) + 3, near.done ? 'rgba(16,20,42,0.92)' : '#fbf8f1', '#0b0d17', 3);
      drawText(ctx, label, Math.max(4, Math.min(ctx.W - tw - 4, x)) + tw / 2, y + 1, near.done ? '#ffd166' : '#1b1e2b', { align: 'center', size: 6.5 });
    }
  }
});

// the chalkboard keeps count: each course you earn is chalked up
registerSetpiece('neuBoard', class {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.y = ty * TILE; this.w = spec.w * TILE; this.h = spec.h * TILE;
    this.level = level;
  }
  books() { const s = this.level.setpieces.find((p) => p.books); return s ? s.books : []; }
  back(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y, w = this.w, h = this.h;
    rect(ctx, x - 3, y - 3, w + 6, h + 6, col('#6b4128'));
    rect(ctx, x - 3, y - 3, w + 6, 1, col('#a26a3e'));
    rect(ctx, x, y, w, h, col('#22382f'));
    rect(ctx, x + 1, y + 1, w - 2, 1, col('#2e4a3e'));
    rect(ctx, x - 1, y + h + 1, w + 2, 3, col('#a26a3e'));       // chalk ledge
    rect(ctx, x + 10, y + h, 6, 2, col('#f5f1e6')); rect(ctx, x + 20, y + h, 4, 2, col('#ffd166'));
    const books = this.books();
    const done = books.filter((b) => b.done).length;
    drawText(ctx, 'Credits ' + done + ' / ' + books.length, x + 8, y + 5, '#eef3ea', { size: 8, weight: 700 });
    rect(ctx, x + 8, y + 7 + lineHeight(8), Math.min(w - 16, 70), 1, col('#a9bfb3'));
    // one chalk glyph per course (double size), a blank line until earned
    const per = Math.max(1, Math.floor((w - 14) / 18));
    books.forEach((b, i) => {
      const gx = x + 8 + (i % per) * 18, gy = y + 14 + lineHeight(8) + Math.floor(i / per) * 16;
      if (b.done) glyph(ctx, b.glyph, gx, gy, col('#eef3ea'), 2);
      else rect(ctx, gx, gy + 10, 14, 1, col('#4c6a5c'));
    });
  }
});

// ─── music: a slow, wintry minor loop ────────────────────────────────

registerSong('neu', {
  bpm: 100,
  lead: steps('D5 . F5 A5 . G5 F5 E5 | D5 . F5 A5 . C6 A5 . | C5 . E5 G5 . F5 E5 D5 | C#5 . E5 . A5 . E5 C#5 | D5 . A4 . F5 . E5 D5 | A#4 . D5 . F5 . A5 . | G4 . C5 . E5 . G5 F5 | E5 . . C#5 A4 . . .'),
  bass: steps('D3 . . . A2 . . . | A#2 . . . F2 . . . | C3 . . . G2 . . . | A2 . . . E2 . A2 .'),
  drums: steps('k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h h s h s h'),
});

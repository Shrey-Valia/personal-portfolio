// DUBLIN HIGH · a golden-hour California high school in its red, white
// and blue: stucco classroom wings with navy trim, outdoor lockers, red
// covered walkways and the golden Tri-Valley hills. Set pieces: the front
// marquee, grade pennants that count 9th → 12th, locker banks you climb,
// a giant laptop you plug into for the EduLearn Hackathon (an online
// event: 700 webcam tiles, a 2-1-3 results podium and the trophy) and the
// commencement stage with its cap toss.

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSkin, registerActorSprites } from '../art/sprites/actors.js';
import { sheet, drawFrame } from '../art/sprite.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { Enemy } from '../game/enemies.js';
import { SOLID } from '../engine/tilemap.js';
import { registerSong, steps } from '../engine/audio.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { stripedSky, disc, noise1, pill, line, mix } from '../art/draw.js';
import { clamp, lerp, ease, rng, hash2, makeCanvas } from '../engine/util.js';

const C = (r) => col(r);
const GROUND = 11;                       // row of the walkway top in the main room

// first solid row at or below (tx, ty): where props stand
function groundRow(map, tx, ty) {
  for (let y = ty; y < map.rows; y++) if (map.flag(tx, y) & SOLID) return y;
  return map.rows;
}
// top row of the terrain column a tile belongs to
function topRow(map, tx, ty) {
  let r = ty;
  while (r > 0 && map.isTerrain(tx, r - 1)) r--;
  return r;
}
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

// ─── kit: concrete walkways on the ground, stucco wings above it ─────

const K = {
  slabHi: col('#f6e9cb'), slab: col('#dfcda9'), slabLo: col('#c4ae88'), joint: col('#9a8461'),
  curb: col('#5b4634'), soil: col('#3d2c22'), soil2: col('#30231b'), pebble: col('#54402f'),
  wall: col('#f0cd98'), wall2: col('#e4bc84'), wallLo: col('#c99b67'), base: col('#a97c52'),
  trim: col('#2b3a7a'), trimHi: col('#4a5cab'), trimLo: col('#1d2656'), coping: col('#fbefd6'),
  can: col('#b8323a'), canHi: col('#e0574f'), canLo: col('#7e1f28'),
  glass: col('#1f4c5b'), glass2: col('#2f6d7a'), glint: col('#ffdb92'), ink: C('ink.0'),
  vent: col('#a9a59b'), ventLo: col('#77736b'),
};

function dhsKit() {
  function ground(ctx, x, y, m, tx, ty, d) {
    ctx.fillStyle = K.soil; ctx.fillRect(x, y, 16, 16);
    const y0 = d === 0 ? 9 : 0;
    for (let i = 0; i < 3; i++) {
      const h = hash2(tx * 3 + i, ty * 7 + i);
      if (h < 0.7) px(ctx, x + Math.floor(h * 997) % 15, y + y0 + Math.floor(h * 331) % (16 - y0), K.pebble);
    }
    if (d === 0) {
      hline(ctx, x, y, 16, K.slabHi);
      ctx.fillStyle = K.slab; ctx.fillRect(x, y + 1, 16, 5);
      hline(ctx, x, y + 6, 16, K.slabLo);
      if (tx % 3 === 0) vline(ctx, x, y + 1, 5, K.joint);
      hline(ctx, x, y + 7, 16, K.curb);
      hline(ctx, x, y + 8, 16, K.soil2);
    }
    if (!(m & 8)) { vline(ctx, x, y, 16, K.soil2); if (d === 0) vline(ctx, x, y, 7, K.slabHi); }
    if (!(m & 2)) { vline(ctx, x + 15, y, 16, K.soil2); if (d === 0) vline(ctx, x + 15, y + 1, 6, K.slabLo); }
  }

  function window(ctx, x, y) {
    ctx.fillStyle = K.trimLo; ctx.fillRect(x + 2, y + 2, 12, 11);
    ctx.fillStyle = K.glass2; ctx.fillRect(x + 3, y + 3, 10, 4);
    ctx.fillStyle = K.glass; ctx.fillRect(x + 3, y + 7, 10, 5);
    vline(ctx, x + 8, y + 3, 9, K.trimLo);
    px(ctx, x + 4, y + 4, K.glint); px(ctx, x + 5, y + 4, K.glint); px(ctx, x + 4, y + 5, K.glint);
    hline(ctx, x + 1, y + 13, 14, K.coping);
  }

  function building(ctx, x, y, m, tx, ty, d, map) {
    ctx.fillStyle = K.wall; ctx.fillRect(x, y, 16, 16);
    for (let i = 0; i < 4; i++) {
      const h = hash2(tx * 5 + i, ty * 11 - i);
      px(ctx, x + Math.floor(h * 16), y + Math.floor(h * 4096) % 16, K.wall2);
    }
    if (d === 0) {
      hline(ctx, x, y, 16, K.coping); hline(ctx, x, y + 1, 16, K.coping);
      hline(ctx, x, y + 2, 16, K.trimHi);
      ctx.fillStyle = K.trim; ctx.fillRect(x, y + 3, 16, 3);
      hline(ctx, x, y + 6, 16, K.trimLo);
      hline(ctx, x, y + 7, 16, K.wallLo);
      if ((m & 10) === 10 && hash2(tx, ty * 3) < 0.22) {       // a roof vent, drawn up into the empty tile
        ctx.fillStyle = K.ventLo; ctx.fillRect(x + 6, y - 5, 4, 5);
        ctx.fillStyle = K.vent; ctx.fillRect(x + 6, y - 5, 3, 5);
        ctx.fillStyle = K.ventLo; ctx.fillRect(x + 5, y - 6, 6, 1);
      }
    } else if (ty >= map.rows - 1) {
      ctx.fillStyle = K.base; ctx.fillRect(x, y + 4, 16, 12);
      hline(ctx, x, y + 4, 16, K.wallLo);
    } else if (d % 3 === 1 && tx % 3 !== 2) {
      window(ctx, x, y);
    } else if (d % 3 === 0) {
      hline(ctx, x, y + 7, 16, K.trimLo); hline(ctx, x, y + 8, 16, K.trim);
    }
    if (!(m & 8)) { vline(ctx, x, y, 16, K.trimLo); vline(ctx, x + 1, y, 16, K.wall2); if (d === 0) { vline(ctx, x, y, 2, K.coping); } }
    if (!(m & 2)) { vline(ctx, x + 15, y, 16, K.wallLo); vline(ctx, x + 14, y, 16, K.wall2); }
  }

  return {
    terrain(ctx, x, y, m, tx, ty, map) {
      const top = topRow(map, tx, ty);
      if (top >= GROUND) ground(ctx, x, y, m, tx, ty, ty - top);
      else building(ctx, x, y, m, tx, ty, ty - top, map);
    },
    // '=' is a covered-walkway canopy: corrugated red metal on slim posts
    oneway(ctx, x, y, joinL, joinR, tx) {
      hline(ctx, x, y, 16, K.canHi);
      ctx.fillStyle = K.can; ctx.fillRect(x, y + 1, 16, 3);
      for (let i = 1; i < 16; i += 4) vline(ctx, x + i, y + 1, 3, K.canLo);
      hline(ctx, x, y + 4, 16, K.canLo);
      hline(ctx, x, y + 5, 16, K.ink);
      // posts at the ends (canopies sit three rows above the walkway)
      const post = (px0) => {
        ctx.fillStyle = col('#7c8a92'); ctx.fillRect(px0, y + 6, 2, 42);
        ctx.fillStyle = col('#55616a'); ctx.fillRect(px0 + 1, y + 6, 1, 42);
      };
      if (!joinL) post(x + 2);
      if (!joinR) post(x + 12);
      if (joinL && joinR && tx % 4 === 0) post(x + 7);
    },
    animated() {},
  };
}

// ─── kit: the online results room (an app window, not a venue) ───────

function onlineKit() {
  const frame = col('#2a2f42'), frameHi = col('#3d4560'), frameLo = col('#1a1d2b');
  const panel = col('#232a52'), panelHi = col('#6fd6c8'), panel2 = col('#1c2244'), panelLo = col('#141938');
  return {
    terrain(ctx, x, y, m, tx, ty, map) {
      const wall = tx === 0 || tx === map.cols - 1 || ty === 0;
      if (wall) {                                   // the window frame
        ctx.fillStyle = frame; ctx.fillRect(x, y, 16, 16);
        vline(ctx, x + (tx === 0 ? 15 : 0), y, 16, frameHi);
        vline(ctx, x + (tx === 0 ? 14 : 1), y, 16, frameLo);
        return;
      }
      const top = !(m & 1) || ty === map.rows - 3;     // the floor reads as floor under the podium too
      ctx.fillStyle = top ? panel : panelLo; ctx.fillRect(x, y, 16, 16);
      if (top) {
        hline(ctx, x, y, 16, panelHi);
        hline(ctx, x, y + 1, 16, col('#3e4fa3'));
        for (let i = 0; i < 16; i += 4) px(ctx, x + i + ((ty * 2) & 3), y + 7, panel2);
        hline(ctx, x, y + 15, 16, panelLo);
      }
      if (!(m & 8)) vline(ctx, x, y, 16, panel2);
      if (!(m & 2)) vline(ctx, x + 15, y, 16, panelLo);
    },
    oneway(ctx, x, y) { hline(ctx, x, y, 16, panelHi); ctx.fillStyle = panel; ctx.fillRect(x, y + 1, 16, 3); hline(ctx, x, y + 4, 16, panelLo); },
    animated() {},
  };
}

registerKit('dhs', dhsKit());
registerKit('dhsOnline', onlineKit());

// ─── backdrop: golden hour over the Tri-Valley hills ─────────────────

function dhsBackdrop(W) {
  const sky = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#2c3c78', '#4a4d8c', '#7a5990', '#b96b88', '#e78c72', '#f9b876', '#ffd99b']);
    const sx = Math.round(W * 0.74), sy = 124;
    disc(ctx, sx, sy, 30, '#ffc982');
    disc(ctx, sx, sy, 23, '#ffe0a0');
    disc(ctx, sx, sy, 17, '#fff3cf');
    // long thin clouds, lit from below
    const r = rng(5);
    for (let i = 0; i < 7; i++) {
      const cy = 36 + Math.floor(r() * 70), cx = Math.floor(r() * W), cw = 30 + Math.floor(r() * 70);
      ctx.fillStyle = col(cy < 70 ? '#8d6aa0' : '#f2a07c'); ctx.fillRect(cx, cy, cw, 2);
      ctx.fillStyle = col(cy < 70 ? '#c58aa6' : '#ffd0a0'); ctx.fillRect(cx + 4, cy + 2, cw - 10, 1);
    }
  });

  const hills = strip(640, (ctx, w) => {
    const layers = [
      { base: 140, amp: 22, freq: 0.010, c: '#d6a061', seed: 4 },
      { base: 156, amp: 16, freq: 0.017, c: '#bf8445', seed: 9, oaks: true },
    ];
    for (const L of layers) {
      const n = noise1(L.seed);
      const ys = [];
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const v = n(t * w * L.freq) * (1 - t) + n((t - 1) * w * L.freq + 256) * t;
        const y = Math.round(L.base - v * L.amp);
        ys.push(y);
        ctx.fillStyle = col(L.c); ctx.fillRect(x, y, 1, H - y);
      }
      if (L.oaks) {                            // valley oaks dotting the golden grass
        const r = rng(13);
        for (let i = 0; i < 26; i++) {
          const x = Math.floor(r() * (w - 8)) + 4, y = ys[x] + 3 + Math.floor(r() * 10);
          disc(ctx, x, y, 2 + Math.floor(r() * 2), '#6b5a2c');
          ctx.fillStyle = col('#8a7a3a'); ctx.fillRect(x - 1, y - 2, 2, 1);
        }
      }
    }
  });

  const campus = strip(800, (ctx, w) => {
    const base = H - 42;
    const wall = col('#e2ab7c'), wallSh = col('#c38a66'), teal = col('#3f4c88'), tealHi = col('#6070ad'), door = col('#b04a50');
    const glass = col('#41687a'), glint = col('#ffd38c'), lawn = col('#9a8a3c'), lawn2 = col('#7f7533');
    ctx.fillStyle = lawn2; ctx.fillRect(0, base, w, H - base);
    ctx.fillStyle = lawn; ctx.fillRect(0, base, w, 2);

    function wing(x, bw, bh) {
      const top = base - bh;
      ctx.fillStyle = wall; ctx.fillRect(x, top, bw, bh);
      ctx.fillStyle = wallSh; ctx.fillRect(x + bw - 5, top, 5, bh);
      ctx.fillStyle = teal; ctx.fillRect(x - 2, top - 3, bw + 4, 3);
      ctx.fillStyle = tealHi; ctx.fillRect(x - 2, top - 3, bw + 4, 1);
      for (const wy of [top + 6, top + bh / 2 + 3]) {
        for (let wx = x + 5; wx < x + bw - 11; wx += 9) {
          ctx.fillStyle = glass; ctx.fillRect(wx, Math.round(wy), 6, 7);
          if ((wx + bh) % 4 === 0) { ctx.fillStyle = glint; ctx.fillRect(wx, Math.round(wy), 2, 2); }
        }
      }
      ctx.fillStyle = door; ctx.fillRect(x + Math.round(bw * 0.4), base - 11, 7, 11);
      ctx.fillStyle = teal; ctx.fillRect(x, top + Math.round(bh / 2) - 2, bw - 5, 1);
    }
    function gym(x, bw, bh) {
      const top = base - bh;
      ctx.fillStyle = wall; ctx.fillRect(x, top, bw, bh);
      for (let dx = 0; dx < bw; dx++) {
        const yy = top - Math.round(Math.sin((Math.PI * dx) / bw) * 11);
        ctx.fillStyle = teal; ctx.fillRect(x + dx, yy, 1, top - yy + 2);
        if (dx % 12 === 0) { ctx.fillStyle = tealHi; ctx.fillRect(x + dx, yy, 1, top - yy); }
      }
      for (let dx = 8; dx < bw - 8; dx += 16) { ctx.fillStyle = wallSh; ctx.fillRect(x + dx, top + 4, 2, bh - 4); }
      ctx.fillStyle = glass; ctx.fillRect(x + 10, top + 6, bw - 20, 4);
      ctx.fillStyle = door; ctx.fillRect(x + bw / 2 - 8, base - 14, 16, 14);
      ctx.fillStyle = wallSh; ctx.fillRect(x + bw - 5, top, 5, bh);
    }
    function walkway(x, ww) {
      ctx.fillStyle = door; ctx.fillRect(x, base - 16, ww, 3);
      ctx.fillStyle = col('#d0686c'); ctx.fillRect(x, base - 16, ww, 1);
      for (let px0 = x + 3; px0 < x + ww; px0 += 12) { ctx.fillStyle = col('#8d8a86'); ctx.fillRect(px0, base - 13, 1, 13); }
    }
    function palm(x, h) {
      for (let i = 0; i < h; i++) {
        const bend = Math.round(Math.sin(i / h * 1.6) * 3);
        ctx.fillStyle = col(i % 4 === 0 ? '#5e4a36' : '#7a624a'); ctx.fillRect(x + bend, base - i, 2, 1);
      }
      const cx = x + 4, cy = base - h;
      for (const [dx, dy] of [[-10, 4], [-8, -3], [-3, -6], [4, -6], [9, -3], [11, 4], [6, 7], [-6, 7]]) {
        line(ctx, cx, cy, cx + dx, cy + dy, '#4f5a2c');
        line(ctx, cx, cy + 1, cx + dx, cy + dy + 1, '#3d4823');
      }
    }
    let x = 6;
    const plan = [['wing', 130, 34], ['palm', 58], ['walk', 36], ['gym', 120, 44], ['palm', 64], ['wing', 104, 30], ['walk', 30], ['wing', 140, 36], ['palm', 54], ['palm', 60]];
    for (const p of plan) {
      if (p[0] === 'wing') { wing(x, p[1], p[2]); x += p[1] + 4; }
      else if (p[0] === 'gym') { gym(x, p[1], p[2]); x += p[1] + 4; }
      else if (p[0] === 'walk') { walkway(x, p[1]); x += p[1]; }
      else { palm(x + 4, p[1]); x += 18; }
    }
  });

  const oaks = strip(560, (ctx, w) => {
    const r = rng(31);
    const leaf = col('#3c4a28'), leafHi = col('#56643a'), trunk = col('#3a2a1f');
    for (let x = 20; x < w - 20; x += 90 + Math.floor(r() * 70)) {
      const cy = H - 70 - Math.floor(r() * 12);
      ctx.fillStyle = trunk; ctx.fillRect(x - 2, cy, 4, H - 44 - cy);
      for (let i = 0; i < 6; i++) disc(ctx, x + Math.round((r() - 0.5) * 34), cy + Math.round((r() - 0.5) * 12), 9 + Math.floor(r() * 5), '#3c4a28');
      for (let i = 0; i < 3; i++) disc(ctx, x - 6 + Math.round((r() - 0.5) * 16), cy - 6 + Math.round(r() * 4), 5, '#56643a');
    }
    // lamp posts
    for (let x = 60; x < w; x += 140) {
      ctx.fillStyle = col('#2a2d33'); ctx.fillRect(x, H - 92, 2, 48);
      ctx.fillStyle = col('#ffe3a0'); ctx.fillRect(x - 2, H - 96, 6, 4);
      ctx.fillStyle = col('#2a2d33'); ctx.fillRect(x - 3, H - 97, 8, 1);
    }
    // a hedge row just above the walkway, then the ground falls away into
    // shadow, so a gap between roofs reads as a drop, not a lower floor
    ctx.fillStyle = leaf; ctx.fillRect(0, H - 52, w, 8);
    for (let x = 0; x < w; x += 6) { ctx.fillStyle = leafHi; ctx.fillRect(x + 1, H - 52, 3, 1); }
    for (let y = H - 44; y < H; y++) {
      const k = (y - (H - 44)) / 44;
      ctx.fillStyle = mix(['#2d381e', '#1f1b21', '#141019'], k);
      ctx.fillRect(0, y, w, 1);
    }
  });

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, hills, camX, 0.06 * k, -camY * 0.1);
      blitStrip(ctx, campus, camX, 0.2 * k, -camY * 0.2);
      blitStrip(ctx, oaks, camX, 0.45 * k, -camY * 0.4);
      ctx.fillStyle = col('#141019'); ctx.fillRect(0, H - 4, ctx.W, 4);      // the strip rides up a few px with the camera
    },
  };
}

// ─── backdrop: inside the hackathon's video call ─────────────────────

function onlineBackdrop() {
  const [c, ctx] = makeCanvas(480, 224);
  stripedSky(ctx, 480, 224, ['#0d1126', '#121733', '#171d40', '#1b2249']);
  // a faint UI grid
  ctx.fillStyle = col('#1d2450');
  for (let x = 16; x < 480; x += 32) ctx.fillRect(x, 16, 1, 160);
  for (let y = 32; y < 176; y += 32) ctx.fillRect(16, y, 448, 1);
  // the call's toolbar, below the HUD
  ctx.fillStyle = col('#20264a'); ctx.fillRect(16, 26, 448, 12);
  ctx.fillStyle = col('#2c335c'); ctx.fillRect(16, 37, 448, 1);
  return { draw(ctx2, camX, camY) { ctx2.fillStyle = col('#05060c'); ctx2.fillRect(0, 0, ctx2.W, H); ctx2.drawImage(c, -camX, -camY); } };
}

registerBackground('dhs', dhsBackdrop);
registerBackground('dhsOnline', onlineBackdrop);

// ─── bugs: the hall-monitor bug wears a safety-orange vest ───────────

registerSkin('dhs', { d: 'orange.1', b: 'orange.2', c: 'orange.3', t: 'gold.3', e: 'white.2', o: 'ink.0', l: 'slate.3' });

// pop quiz: a paper plane folded from a ruled quiz sheet
const PLANE = [`
w...............
wwww............
.wwwwww.........
.bwwwwwwww......
..WWWwwwwwrrw...
...WWWWWWWWWwwww
.....kkkkkkWW...
.......kkk......`];
const PAPER_BALL = [`
..wwww..
.wWwwbw.
wwbwwWww
wWwwrwWw
wwWwwwbw
.wwWwWw.
..wwww..`];
const PAPER = { w: 'white.2', W: 'white.1', k: 'white.0', b: 'cyan.2', r: 'red.2' };

registerActorSprites(() => ({
  'dhs:plane': sheet(PLANE, PAPER, { name: 'dhs-plane' }),
  'dhs:ball': sheet(PAPER_BALL, PAPER, { name: 'dhs-ball' }),
}));

// glides back and forth across a lane with a slow bob; stomp to crumple it
class PopQuiz extends Enemy {
  constructor(tx, ty, spec) {
    super(tx * TILE + 1, ty * TILE + 4, 14, 8);
    this.home = this.spawnX;
    this.range = (spec.range || 5) * TILE;
  }
  reset() { super.reset(); this.dir = -1; this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) {
      this.vy = Math.min(this.vy + 0.2, 4); this.y += this.vy; this.x += this.dir * 0.3;
      if (++this.flat > 70) this.alive = false;
      return;
    }
    if (!this.wake(level)) return;
    this.t++;
    this.x += this.dir * 0.7;
    if (this.x < this.home - this.range) this.dir = 1;
    if (this.x > this.home + this.range) this.dir = -1;
    this.y = this.spawnY + Math.round(Math.sin(this.t / 24) * 5);
  }
  stomp(level) { super.stomp(level); this.vy = -1.5; }
  draw(ctx, cam, t, A, level, alpha) {
    const x = lerp(this.prevX, this.x, alpha) - cam.x, y = lerp(this.prevY, this.y, alpha) - cam.y;
    if (this.flat) { drawFrame(ctx, A.actors['dhs:ball'][0], x + 3, y, false, 8); return; }
    drawFrame(ctx, A.actors['dhs:plane'][0], x - 1, y - 1, this.dir < 0, 14);
  }
}

registerSetpiece('dhsPlane', class { constructor(tx, ty, spec, level) { level.enemies.push(new PopQuiz(tx, ty, spec)); } });

// ─── the front marquee: monument sign with a letterboard ─────────────

registerSetpiece('dhsMarquee', class {
  constructor(tx, ty, spec, level) {
    this.cx = tx * TILE + 8; this.y = ty * TILE;
    this.ground = groundRow(level.map, tx, ty) * TILE;
    this.title = spec.title; this.lines = spec.lines || [];
  }
  back(ctx, cam, t) {
    const tw = Math.max(textWidth(this.title, 9, 700), ...this.lines.map((l) => textWidth(l, 7.5)));
    const w = Math.ceil(tw) + 26, x = Math.round(this.cx - w / 2 - cam.x), y = this.y - cam.y;
    const hh = lineHeight(9) + 8, lh = lineHeight(7.5), bh = this.lines.length * lh + 8;
    const g = this.ground - cam.y;
    // stucco pillars with red caps, a planter of flowers at the foot
    for (const px0 of [x + 4, x + w - 16]) {
      rect(ctx, px0 - 1, y - 3, 14, g - y + 3, K.ink);
      rect(ctx, px0, y - 2, 12, g - y + 2, K.wall);
      rect(ctx, px0 + 9, y - 2, 3, g - y + 2, K.wallLo);
      rect(ctx, px0 - 2, y - 5, 16, 3, K.can); rect(ctx, px0 - 2, y - 5, 16, 1, K.canHi);
    }
    rect(ctx, x + 6, g - 10, w - 12, 10, K.ink);
    rect(ctx, x + 7, g - 9, w - 14, 9, col('#9a6a44'));
    for (let i = 0; i < w - 18; i += 4) {
      rect(ctx, x + 9 + i, g - 12 - (i % 3), 2, 3, C('grass.2'));
      rect(ctx, x + 9 + i, g - 13 - (i % 3), 2, 2, C(['magenta.3', 'gold.3', 'white.2', 'red.3'][(i / 4) % 4]));
    }
    // header panel
    pill(ctx, x, y, w, hh, K.trim, '#0b0d17', 3);
    rect(ctx, x + 2, y + hh - 4, w - 4, 2, K.can); rect(ctx, x + 2, y + hh - 2, w - 4, 1, col('#fbf8f1'));
    drawText(ctx, this.title, x + w / 2, y + 3, '#fbf8f1', { align: 'center', size: 9, weight: 700 });
    // letterboard
    const by = y + hh + 2;
    pill(ctx, x + 6, by, w - 12, bh, '#11131c', '#0b0d17', 2);
    for (let i = 0; i < this.lines.length; i++) {
      drawText(ctx, this.lines[i], x + w / 2, by + 4 + i * lh, '#fbf8f1', { align: 'center', size: 7.5 });
    }
    for (let i = 10; i < w - 10; i += 5) rect(ctx, x + i, by + 1, 2, 1, ((i / 5 + (t >> 4)) & 3) === 0 ? col('#fbf8f1') : col('#3a3528'));
  }
});

// ─── grade pennants on light poles: 9th, 10th, 11th, 12th ─────────────

registerSetpiece('dhsGrade', class {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE + 6;
    this.base = groundRow(level.map, tx, ty) * TILE;
    this.big = spec.big; this.small = spec.small || 'grade';
  }
  back(ctx, cam, t) {
    const x = this.x - cam.x, b = this.base - cam.y, top = b - 78;
    rect(ctx, x - 1, top, 4, 78, K.ink);
    rect(ctx, x, top, 2, 78, col('#8f9aa6'));
    rect(ctx, x + 1, top, 1, 78, col('#5d6670'));
    rect(ctx, x - 1, top - 3, 4, 3, K.can);
    rect(ctx, x, top + 4, 22, 2, col('#5d6670'));
    // the banner sways a little in the evening breeze
    const sway = Math.round(Math.sin(t / 40 + this.x) * 1);
    const bx = x + 3 + sway, by = top + 6, bw = 28, bh = 38;
    rect(ctx, bx - 1, by, bw + 2, bh, K.ink);
    rect(ctx, bx, by, bw, bh - 1, K.trim);
    rect(ctx, bx, by, bw, 3, K.can); rect(ctx, bx, by + 3, bw, 1, col('#fbf8f1'));
    rect(ctx, bx + 2, by + 5, 1, bh - 10, K.trimHi);
    for (let i = 0; i < 7; i++) {                       // swallowtail notch
      rect(ctx, bx + bw / 2 - 7 + i, by + bh - 1 - i, 14 - i * 2, 1, K.ink);
    }
    drawText(ctx, this.big, bx + bw / 2, by + 7, '#fbf8f1', { align: 'center', size: 10, weight: 700 });
    drawText(ctx, this.small, bx + bw / 2, by + 20, '#c9d3f0', { align: 'center', size: 6.5 });
  }
});

// ─── outdoor lockers: one '[' per column, tops are one-way platforms ──

const LOCK = { body: C('indigo.2'), hi: C('indigo.3'), lo: C('indigo.1'), dark: C('indigo.0'), plate: col('#e3e6ee'), steel: col('#c9ced8') };

registerSetpiece('dhsLockers', class {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.y = ty * TILE;
    this.bottom = groundRow(level.map, tx, ty + 1) * TILE;
    const rows = level.room.map;
    const at = (x, y) => (rows[y] && rows[y][x]) === '[';
    this.capL = !at(tx - 1, ty); this.capR = !at(tx + 1, ty);
    this.num = 100 + Math.floor(hash2(tx, ty) * 400);
    this.lock = hash2(ty, tx) < 0.3;
    level.platforms.push(platform(this.x, this.y, TILE, 4));
  }
  back(ctx, cam) {
    const x = this.x - cam.x, y = this.y - cam.y, h = this.bottom - this.y;
    if (x > ctx.W || x < -16) return;
    rect(ctx, x, y, 16, h, LOCK.body);
    rect(ctx, x, y, 16, 3, LOCK.dark); rect(ctx, x, y, 16, 1, LOCK.hi);
    rect(ctx, x + 1, y + 4, 1, h - 9, LOCK.hi);
    rect(ctx, x + 14, y + 4, 1, h - 9, LOCK.lo);
    rect(ctx, x + 15, y + 3, 1, h - 3, K.ink);
    if (this.capL) rect(ctx, x, y, 1, h, K.ink);
    // vents, number plate, latch
    for (let i = 0; i < 3; i++) rect(ctx, x + 4, y + 6 + i * 2, 8, 1, LOCK.lo);
    rect(ctx, x + 6, y + 13, 4, 2, LOCK.plate);
    const ly = y + Math.min(h - 12, 22);
    rect(ctx, x + 11, ly, 2, 6, LOCK.steel);
    if (this.lock) { rect(ctx, x + 10, ly + 6, 4, 3, col('#7d8590')); rect(ctx, x + 11, ly + 5, 2, 1, LOCK.steel); }
    if (h > 40) for (let i = 0; i < 3; i++) rect(ctx, x + 4, y + h - 14 + i * 2, 8, 1, LOCK.lo);
    rect(ctx, x, y + h - 4, 16, 4, C('slate.1'));
  }
});

// ─── the giant laptop: the wall you "log in" through ────────────────
// The hackathon was online, so there's no venue: the port is plugged
// into a laptop the size of a building, showing the call's gallery.

registerSetpiece('dhsLaptop', class {
  constructor(tx, ty, spec, level) {
    this.x = (tx + 1) * TILE; this.w = spec.w * TILE;
    this.ground = groundRow(level.map, tx, ty) * TILE;
    this.title = spec.title;
    this.port = (tx + (spec.port || -3)) * TILE;          // where the cable starts
    const r = rng(tx * 5 + 1);
    this.tiles = [];
    for (let i = 0; i < 160; i++) this.tiles.push([SKINS[Math.floor(r() * SKINS.length)], SHIRTS[Math.floor(r() * SHIRTS.length)], TILEBG[Math.floor(r() * TILEBG.length)], Math.floor(r() * 64)]);
  }
  back(ctx, cam, t) {
    // the cable from the conduit along the walk and up into the laptop
    const g = this.ground - cam.y, x0 = this.port - cam.x + 30, x1 = this.x - cam.x + 2;
    rect(ctx, x0, g - 4, x1 - x0, 2, col('#1b1d26'));
    rect(ctx, x0, g - 4, x1 - x0, 1, col('#3a3e4c'));
    rect(ctx, x1 - 2, g - 8, 4, 6, col('#9aa0ad'));
  }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, w = this.w, g = this.ground - cam.y, top = -cam.y;
    if (x > ctx.W || x + w < 0) return;
    // lid
    rect(ctx, x, top, w, g - top - 9, col('#2a2d36'));
    rect(ctx, x, top, 1, g - top - 9, K.ink); rect(ctx, x + 1, top, 1, g - top - 9, col('#4a4f5e'));
    rect(ctx, x + w - 2, top, 2, g - top - 9, col('#1b1d24'));
    // screen
    const sx = x + 6, sy = top + 22, sw = w - 12, sh = g - 9 - 8 - sy;
    rect(ctx, sx, sy, sw, sh, col('#11152c'));
    rect(ctx, sx, sy, sw, 11, col('#1f2550'));
    for (const [i, c] of [[0, 'red.2'], [1, 'gold.2'], [2, 'green.2']]) rect(ctx, sx + 3 + i * 5, sy + 4, 3, 3, C(c));
    drawText(ctx, this.title, sx + 20, sy + 1, '#ffd166', { size: 6.5, weight: 700 });
    // a "live" badge, then the gallery of webcam tiles
    rect(ctx, sx + sw - 24, sy + 2, 21, 7, C('red.2'));
    drawText(ctx, 'Live', sx + sw - 13.5, sy + 1, '#fbf8f1', { align: 'center', size: 5.5, weight: 700 });
    const cols = Math.floor((sw - 4) / 10), rows = Math.floor((sh - 18) / 8);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++, i++) {
      const [skin, shirt, bg, ph] = this.tiles[i % this.tiles.length];
      const tx = sx + 3 + q * 10, ty = sy + 15 + r * 8;
      rect(ctx, tx, ty, 9, 7, bg);
      rect(ctx, tx + 3, ty + 1, 3, 3, skin);
      rect(ctx, tx + 2, ty + 4, 5, 3, shirt);
      if (((t >> 4) + ph) % 37 === 0) { rect(ctx, tx, ty, 9, 1, C('green.3')); rect(ctx, tx, ty + 6, 9, 1, C('green.3')); }
    }
    // keyboard deck on the walk
    rect(ctx, x - 6, g - 9, w + 12, 9, K.ink);
    rect(ctx, x - 5, g - 8, w + 10, 7, col('#9aa0ad'));
    rect(ctx, x - 5, g - 8, w + 10, 1, col('#c9ced8'));
    for (let k = 0; k < w; k += 6) rect(ctx, x + 2 + k, g - 6, 4, 2, col('#5d626d'));
    rect(ctx, x + w / 2 - 14, g - 3, 28, 2, col('#7d818b'));
    // the walk runs on in front of it
    rect(ctx, x - 6, g, w + 12, H + 8 - g, K.soil);
    rect(ctx, x - 6, g, w + 12, 1, K.slabHi); rect(ctx, x - 6, g + 1, w + 12, 5, K.slab);
    rect(ctx, x - 6, g + 6, w + 12, 1, K.slabLo); rect(ctx, x - 6, g + 7, w + 12, 1, K.curb); rect(ctx, x - 6, g + 8, w + 12, 1, K.soil2);
  }
});

// ─── mortarboards: tossed caps settle into stepping stones ───────────

function drawCap(ctx, cx, y, k, t, seed) {
  // the board is a square seen from slightly above: a flat diamond whose
  // widest row is the surface you stand on. k squashes it mid-spin.
  cx = Math.round(cx); y = Math.round(y);
  const s = Math.abs(k), under = k < 0;
  const widths = [6, 16, 24, 16, 6].map((w) => Math.max(2, Math.round(w * s)));
  const rows = under ? widths.slice().reverse() : widths;
  const y0 = y - 2;
  const cap = (yy) => { rect(ctx, cx - 6, yy - 1, 12, 6, K.ink); rect(ctx, cx - 5, yy, 10, 4, col('#1c2036')); rect(ctx, cx - 5, yy, 10, 1, col('#2b3150')); };
  if (under) cap(y0 - 5);
  rows.forEach((w, i) => rect(ctx, cx - w / 2 - 1, y0 + i - 1, w + 2, 3, K.ink));
  rows.forEach((w, i) => rect(ctx, cx - w / 2, y0 + i, w, 1, i < 2 ? col('#3e4672') : col('#262b48')));
  if (!under) cap(y0 + 5);
  // button and swinging red tassel off the front corner
  rect(ctx, cx - 1, y0 + 1, 2, 1, C('red.3'));
  const sw = Math.round(Math.sin(t / 14 + seed) * 1.5);
  const tx = cx + Math.round(9 * s);
  rect(ctx, cx, y0 + 1, Math.max(0, tx - cx), 1, C('red.2'));
  rect(ctx, tx + sw, y0 + 2, 1, 6, C('red.2'));
  rect(ctx, tx + sw - 1, y0 + 7, 3, 3, C('red.3'));
}

registerSetpiece('dhsCaps', class {
  constructor(tx, ty, spec, level, key) {
    this.key = key;
    this.w = spec.w || 26;
    const ox = tx * TILE;
    const r = rng(tx * 17 + 3);
    this.caps = spec.caps.map(([dx, top], i) => {
      const x = ox + dx;
      const p = platform(x, top, this.w, 4, false);
      level.platforms.push(p);
      return { x, top, p, i, sx: x + (r() - 0.5) * 30, seed: r() * 10 };
    });
    this.x0 = this.caps[0].x;
    this.triggered = level.state.built.has(key);
    this.t = this.triggered ? 999 : 0;
    this.update(level);
  }
  update(level) {
    const h = level.hero;
    if (!this.triggered && h.x + h.w > this.x0 - 150) {
      this.triggered = true;
      level.sfx('build');
      level.state.built.add(this.key);
    }
    if (this.triggered) this.t++;
    for (const c of this.caps) {
      const k = clamp((this.t - c.i * 9) / 44, 0, 1);
      c.k = k;
      const bob = k >= 1 ? Math.round(Math.sin(this.t / 30)) : 0;   // all in step, so the rise between caps never changes
      c.p.prevY = c.p.y;
      c.p.y = c.top + bob;
      c.p.active = k >= 1;
    }
  }
  draw(ctx, cam, t) {
    for (const c of this.caps) {
      if (c.k <= 0) continue;
      const e = ease.outBack(c.k);
      const x = lerp(c.sx, c.x, e) + this.w / 2 - cam.x;
      const y = lerp(H + 30, c.top, e) - cam.y + (c.k >= 1 ? c.p.y - c.top : 0);
      const spin = c.k >= 1 ? 1 : Math.cos(c.k * Math.PI * 5);
      drawCap(ctx, x, y, spin, t, c.seed);
    }
  }
});

// ─── commencement stage: skirt, balloon arch, banner, victory toss ───

registerSetpiece('dhsStage', class {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.w = spec.w * TILE;
    this.top = groundRow(level.map, tx, ty) * TILE;
    this.text = spec.text;
    this.level = level;
    this.toss = null;
  }
  update(level) {
    if (!this.toss && level.hero.state === 'victory') {
      const r = rng(77);
      this.toss = [];
      for (let i = 0; i < 14; i++) {
        this.toss.push({ x: level.hero.x + (r() - 0.5) * 150, y: this.top - 4, vx: (r() - 0.5) * 0.8, vy: -2.4 - r() * 1.2, s: r() * 10, k: r() * 6, wait: i * 3 });
      }
      level.sfx('build');
    }
    if (this.toss) for (const c of this.toss) { if (c.wait-- > 0) continue; c.x += c.vx; c.y += c.vy; c.vy += 0.045; c.k += 0.15; }
  }
  back(ctx, cam, t) {
    const x = this.x - cam.x, top = this.top - cam.y, w = this.w;
    // balloon arch over the stage, banner in the middle
    const cx = x + w / 2, ay = top - 10, rx = w / 2 - 18, ry = Math.min(92, this.top - 40);
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI * (i / 26);
      const bx = cx - Math.cos(a) * rx, by = ay - Math.sin(a) * ry;
      disc(ctx, bx, by, 4, 'ink.0');
      const k = i % 3;
      disc(ctx, bx, by, 3, k === 0 ? 'red.2' : k === 1 ? 'white.2' : 'indigo.2');
      rect(ctx, bx - 1, by - 2, 1, 1, k === 0 ? C('red.3') : k === 1 ? col('#ffffff') : C('indigo.3'));
    }
    const tw = Math.ceil(textWidth(this.text, 9, 700)) + 20;
    const by = ay - ry - 4;                       // hung from the top of the arch
    pill(ctx, cx - tw / 2, by, tw, lineHeight(9) + 8, K.can, '#0b0d17', 3);
    drawText(ctx, this.text, cx, by + 4, '#fbf8f1', { align: 'center', size: 9, weight: 700 });
  }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, top = this.top - cam.y, w = this.w;
    if (x > ctx.W || x + w < 0) return;
    // stage floor lip and a pleated navy skirt with red and white trim
    rect(ctx, x, top, w, 4, col('#c98a45')); rect(ctx, x, top, w, 1, col('#f4c98a'));
    rect(ctx, x, top + 4, w, H - top + 8, col('#232a5c'));
    for (let i = 4; i < w; i += 8) rect(ctx, x + i, top + 6, 2, H - top, col('#1a1f48'));
    for (let i = 0; i < w; i += 16) {
      ctx.fillStyle = col('#2f3874');
      ctx.beginPath(); ctx.moveTo(x + i, top + 4); ctx.lineTo(x + i + 16, top + 4); ctx.lineTo(x + i + 8, top + 12); ctx.fill();
    }
    rect(ctx, x, top + 4, w, 1, col('#fbf8f1')); rect(ctx, x, top + 5, w, 1, K.can);
    rect(ctx, x, top, 1, H - top + 8, K.ink);
    if (this.toss) for (const c of this.toss) if (c.wait < 0) drawCap(ctx, c.x - cam.x, c.y - cam.y, Math.cos(c.k), t, c.s);
  }
});

// ─── the call: 700 webcam tiles, the results window, reactions ──────

const SKINS = ['#5a321f', '#7c4729', '#a0653d', '#c0845a', '#e0b08a'].map(col);
const SHIRTS = ['teal.2', 'gold.2', 'magenta.2', 'cyan.2', 'red.2', 'white.1', 'indigo.3', 'green.2', 'orange.2', 'teal.3', 'gold.3'].map(C);
const TILEBG = ['#2a3366', '#323a6e', '#273058', '#3a3a5c', '#2b3f5c', '#3b3150'].map(col);
const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
const STAR = ['..x..', '.xxx.', 'xxxxx', '.x.x.', 'x...x'];

registerSetpiece('dhsGallery', class {
  constructor(tx, ty, spec, level) {
    this.fact = level.room.facts.trophy[0];
    this.level = level;
    const win = spec.window;                                // the results window, kept clear
    const r = rng(700);
    this.tiles = [];
    for (let y = spec.area[1]; y + 5 <= spec.area[3] && this.tiles.length < spec.n; y += 7) {
      for (let x = spec.area[0]; x + 6 <= spec.area[2] && this.tiles.length < spec.n; x += 7) {
        if (x + 6 > win[0] && x < win[2] && y + 5 > win[1] && y < win[3]) continue;
        this.tiles.push({ x, y, skin: SKINS[Math.floor(r() * SKINS.length)], shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], bg: TILEBG[Math.floor(r() * TILEBG.length)], ph: Math.floor(r() * 97) });
      }
    }
    this.win = win;
    // prerender the still gallery once; per frame only the highlights move
    const [c, g] = makeCanvas(480, 224);
    for (const p of this.tiles) {
      g.fillStyle = p.bg; g.fillRect(p.x, p.y, 6, 5);
      g.fillStyle = p.skin; g.fillRect(p.x + 2, p.y + 1, 2, 2);
      g.fillStyle = p.shirt; g.fillRect(p.x + 1, p.y + 3, 4, 2);
    }
    this.canvas = c;
    this.won = level.game.progress.hasFact(this.fact);
    this.waveT = this.won ? 999 : -1;
    this.pops = [];
  }
  onFact(id) { if (id === this.fact) { this.won = true; this.waveT = 0; } }
  update() {
    if (this.waveT >= 0) this.waveT++;
    if (this.level.game.reduced) return;
    // reactions float up from the gallery once you've won
    if (this.won && this.waveT < 600 && Math.random() < 0.25) {
      const p = this.tiles[(Math.random() * this.tiles.length) | 0];
      this.pops.push({ x: p.x, y: p.y, life: 60, k: Math.random() < 0.5 });
    }
    for (const p of this.pops) { p.y -= 0.5; p.life--; }
    this.pops = this.pops.filter((p) => p.life > 0);
  }
  back(ctx, cam, t) {
    const reduced = this.level.game.reduced;
    const ox = -cam.x, oy = -cam.y;
    ctx.drawImage(this.canvas, ox, oy);
    if (!reduced) {
      // someone is always talking; after the win, applause sweeps the call
      const front = this.waveT >= 0 && this.waveT < 360 ? (this.waveT * 3.2) % 520 - 20 : -999;
      for (const p of this.tiles) {
        const lit = Math.abs(p.x - front) < 8;
        if (lit || ((t >> 4) + p.ph) % 97 === 0) {
          ctx.fillStyle = lit ? C('gold.3') : C('green.3');
          ctx.fillRect(p.x + ox, p.y + oy, 6, 1); ctx.fillRect(p.x + ox, p.y + oy + 4, 6, 1);
        }
      }
      for (const p of this.pops) {
        if (p.life < 10 && (p.life & 1)) continue;
        const g = p.k ? HEART : STAR, c = p.k ? C('red.3') : C('gold.3');
        ctx.fillStyle = c;
        g.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === 'x') ctx.fillRect(Math.round(p.x + ox + i), Math.round(p.y + oy + j - 6), 1, 1); });
      }
    }
    // title bar and the results window
    rect(ctx, 22 + ox, 28 + oy, 22, 8, C('red.2'));
    drawText(ctx, 'Live', 33 + ox, 27 + oy, '#fbf8f1', { align: 'center', size: 6, weight: 700 });
    drawText(ctx, 'EduLearn Hackathon · online', 52 + ox, 27 + oy, '#c9d3f0', { size: 6.5 });
    const [wx0, wy0, wx1, wy1] = this.win;
    const sx = wx0 + 2 + ox, sy = wy0 + 2 + oy, sw = wx1 - wx0 - 4, sh = wy1 - wy0 - 4;
    pill(ctx, sx - 2, sy - 2, sw + 4, sh + 4, '#2a3366', '#0b0d17', 3);
    rect(ctx, sx, sy, sw, 9, col('#1f2550'));
    for (const [i, c] of [[0, 'red.2'], [1, 'gold.2'], [2, 'green.2']]) rect(ctx, sx + 3 + i * 5, sy + 3, 3, 3, C(c));
    drawText(ctx, 'Results', sx + 20, sy, '#c9d3f0', { size: 6 });
    rect(ctx, sx, sy + 9, sw, sh - 9, col('#070914'));
    if (!this.won) {
      drawText(ctx, 'EduLearn Hackathon', sx + sw / 2, sy + 11, '#ffd166', { align: 'center', size: 7.5, weight: 700 });
      drawText(ctx, 'Final results', sx + sw / 2, sy + 22, '#6fd6c8', { align: 'center', size: 6.5 });
    } else {
      const blink = reduced || ((t >> 4) & 1);
      drawText(ctx, '1st place', sx + sw / 2, sy + 10, blink ? '#ffe08a' : '#f2b233', { align: 'center', size: 10, weight: 700 });
      drawText(ctx, 'EduLearn Hackathon', sx + sw / 2, sy + 24, '#6fd6c8', { align: 'center', size: 6 });
    }
  }
});

// ─── podium 2-1-3 and the trophy on top of 1st ───────────────────────

registerSetpiece('dhsPodium', class {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.fact = level.room.facts.trophy[0];
    this.steps = spec.steps.map(({ dx, w, n }) => {
      const x = (tx + dx) * TILE;
      return { x, w: w * TILE, n, top: groundRow(level.map, tx + dx, ty) * TILE };
    });
    this.floor = groundRow(level.map, tx - 1, ty) * TILE;
    const first = this.steps.find((s) => s.n === 1);
    this.first = first;
    this.tx = first.x + first.w / 2;            // trophy centre
    this.ty = first.top;                        // trophy stands here
    this.won = level.game.progress.hasFact(this.fact);
    this.lift = this.won ? 1 : 0;
    this.confetti = 0;
  }
  update(level) {
    const h = level.hero;
    // any pass over 1st place counts: the column above it, all the way up
    if (!this.won && h.state === 'normal' && h.x + h.w > this.first.x && h.x < this.first.x + this.first.w && h.y + h.h <= this.first.top + 1) {
      this.won = true;
      this.confetti = 200;
      level.discover(this.fact, this.tx, this.ty - 18);
      level.camera.shake(0.3);
    }
    if (this.won) this.lift = Math.min(1, this.lift + 1 / 40);
    if (this.confetti > 0) {
      this.confetti--;
      const P = level.game.particles;
      const cols = [C('gold.3'), C('teal.3'), C('magenta.3'), C('white.2'), C('cyan.3')];
      if (this.confetti % 3 === 0) P.one(24 + Math.random() * 432, 18, (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.6, cols[(Math.random() * 5) | 0], 140, 0.01, 2);
      if (this.confetti > 160 && this.confetti % 8 === 0) P.burst(this.tx, this.ty - 24, 10, cols, { speed: 2.4, up: 2, life: 50, grav: 0.06 });
    }
  }
  draw(ctx, cam, t) {
    const medal = { 1: ['gold.2', 'gold.3', '#c27a18'], 2: ['white.1', 'white.2', '#8a93a8'], 3: ['orange.1', 'orange.3', '#9b5a2a'] };
    for (const s of this.steps) {
      const x = s.x - cam.x, y = s.top - cam.y, hgt = this.floor - s.top;
      const [band, hi, num] = medal[s.n];
      rect(ctx, x, y, s.w, hgt, col('#eef0f6'));
      rect(ctx, x, y, s.w, 4, C(band)); rect(ctx, x, y, s.w, 1, C(hi));
      rect(ctx, x + s.w - 3, y + 4, 3, hgt - 4, col('#c3c8d6'));
      rect(ctx, x, y + 4, 1, hgt - 4, col('#ffffff'));
      rect(ctx, x, y, 1, hgt, K.ink); rect(ctx, x + s.w - 1, y, 1, hgt, K.ink);
      drawText(ctx, String(s.n), x + s.w / 2, y + Math.max(5, hgt / 2 - 8), num, { align: 'center', size: 13, weight: 700 });
    }
    // the trophy: hoisted and glowing once won
    const lift = ease.outCubic(this.lift) * 8;            // raised, but clear of the results window
    const bob = this.won ? Math.round(Math.sin(t / 16) * 1.5) : 0;
    const x = Math.round(this.tx - cam.x), y = Math.round(this.ty - cam.y - lift + bob);
    if (this.won && ((t >> 3) & 1)) {
      for (const [dx, dy] of [[-12, -14], [11, -18], [-9, -26], [13, -6]]) rect(ctx, x + dx, y + dy, 1, 3, C('white.2')), rect(ctx, x + dx - 1, y + dy + 1, 3, 1, C('white.2'));
    }
    trophy(ctx, x, y);
    if (!this.won) {
      const by = (t >> 4) & 1;
      drawText(ctx, '▼', x, y - 34 - by, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 8 });
    }
  }
});

// a gold cup on a wooden plinth, base centred at (x, y)
function trophy(ctx, x, y) {
  const o = K.ink, g1 = C('gold.1'), g2 = C('gold.2'), g3 = C('gold.3');
  rect(ctx, x - 6, y - 4, 12, 4, o); rect(ctx, x - 5, y - 3, 10, 3, col('#6b3f22'));
  rect(ctx, x - 3, y - 2, 6, 1, g2);
  rect(ctx, x - 4, y - 6, 8, 2, o); rect(ctx, x - 3, y - 6, 6, 1, g2);
  rect(ctx, x - 2, y - 9, 4, 3, o); rect(ctx, x - 1, y - 9, 2, 3, g2);
  // bowl
  const rows = [10, 10, 10, 10, 9, 8, 6, 4];
  rows.forEach((w, i) => {
    const yy = y - 18 + i;
    rect(ctx, x - w / 2 - 1, yy, w + 2, 1, o);
  });
  rows.forEach((w, i) => {
    const yy = y - 18 + i;
    rect(ctx, x - w / 2, yy, w, 1, g2);
    rect(ctx, x - w / 2, yy, 2, 1, g3);
    rect(ctx, x + w / 2 - 2, yy, 2, 1, g1);
  });
  rect(ctx, x - 6, y - 19, 12, 1, o); rect(ctx, x - 5, y - 19, 10, 1, g3);
  // handles
  for (const s of [-1, 1]) {
    const hx = x + s * 7;
    rect(ctx, hx - 1, y - 17, 3, 1, o); rect(ctx, hx - 1, y - 13, 3, 1, o);
    rect(ctx, hx + s, y - 17, 1, 5, o);
    rect(ctx, hx, y - 16, 1, 3, g2);
  }
  rect(ctx, x - 1, y - 16, 2, 4, g1);       // an engraved 1
}

// ─── music: a bright, slightly marching school-spirit loop ────────────

registerSong('dhs', {
  bpm: 124,
  lead: steps('F4 . A4 . C5 . A4 G4 | G4 . B4 . D5 . B4 A4 | E4 . G4 . B4 . A4 G4 | A4 . . G4 E4 . C5 . | F4 A4 C5 F5 E5 . C5 . | D5 . B4 . G4 . D5 . | E5 . D5 C5 B4 . G4 . | A4 . C5 . E5 . . .'),
  bass: steps('F2 . C3 . F3 . C3 . | G2 . D3 . G3 . D3 . | E2 . B2 . E3 . B2 . | A2 . E3 . A2 . G2 .'),
  drums: steps('k . h . s . h . | k . h . s . h k | k . h . s . h . | k . s . s s s .'),
});

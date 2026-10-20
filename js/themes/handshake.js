// LABEL FACTORY · Handshake AI (AI training, remote, Jan–May 2026).
// A labeling plant floating in the cloud layer, because the job was
// remote. What each piece claims:
//   mislabels (m)   image cards wearing the wrong tag (a cat tagged "dog");
//                   a stomp audits the card and flips the tag (x-hs-1)
//   audit line      a stamp press checks each card on the belt against a
//                   quality and safety rubric, then stamps Pass or Flag
//   denoise         platforms start as pure noise and resolve over 20
//                   diffusion steps into what the prompt asked for; once
//                   rated, a fine-tuned model denoises as you go (x-hs-2)
//   noise clouds (z)  drifting static
//   failure gallery   broken generations (extra finger, misspelled sign,
//                   wrong colour) that your feedback fixes (x-hs-3)

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { stripedSky, disc, pill } from '../art/draw.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { compileMap } from '../art/sprite.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { registerEnemy, Enemy } from '../game/enemies.js';
import { Floater } from '../game/objects.js';
import { TUNING } from '../game/tuning.js';
import { registerSong, steps } from '../engine/audio.js';
import { moveBody } from '../engine/physics.js';
import { SOLID, ONEWAY } from '../engine/tilemap.js';
import { clamp, lerp, ease, rng, hash2, makeCanvas, overlaps } from '../engine/util.js';

const C = (r) => col(r);
const INK = '#0b0d17';

// first solid row at or below ty in column tx, as a y in px
function floorBelow(map, tx, ty) {
  let y = ty;
  while (y < map.rows && !(map.flag(tx, y) & SOLID)) y++;
  return y * TILE;
}

// is the hero (or anything) near enough to the screen to bother drawing?
const onScreen = (x, w, cam, ctx) => x - cam.x < ctx.W + 8 && x + w - cam.x > -8;

// ─── terrain: steel decks on cloud banks ─────────────────────────────

const solidChar = (map, tx, ty) => {
  if (tx < 0 || tx >= map.cols || ty >= map.rows) return true;
  if (ty < 0) return false;
  const c = map.chars[ty][tx];
  return c === '#' || c === '<' || c === '>';
};
// the engine's mask ignores conveyors; count them as terrain so belts
// sit flush in the deck instead of cutting holes in it
const maskOf = (map, tx, ty) =>
  (solidChar(map, tx, ty - 1) ? 1 : 0) | (solidChar(map, tx + 1, ty) ? 2 : 0) |
  (solidChar(map, tx, ty + 1) ? 4 : 0) | (solidChar(map, tx - 1, ty) ? 8 : 0);

function factoryKit() {
  const K = {
    hi: C('white.2'), plate: C('#d2d8e2'), plateLo: C('#a9b2c2'), seam: C('#78839a'),
    stripe: C('orange.2'), shadow: C('#5d6680'),
    c1: C('white.2'), c2: C('#e4e9f3'), c3: C('#aebcd9'), dark: C('#1f2738'), brace: C('#34405a'),
    w1: C('steel.2'), w2: C('steel.3'), w3: C('steel.4'), ink: C('ink.0'), lamp: C('cyan.3'),
    belt: C('#2b3040'), chev: C('cyan.3'),
  };

  // the floor's substructure: a riveted girder, then an open truss that
  // rests on a bank of cloud at the very bottom
  function girder(ctx, x, y, tx) {
    ctx.fillStyle = K.w2; ctx.fillRect(x, y, 16, 4);
    hline(ctx, x, y, 16, K.w3);
    for (let i = (tx * 16) % 6; i < 16; i += 6) px(ctx, x + i, y + 2, K.w1);
    hline(ctx, x, y + 4, 16, K.ink);
  }
  function truss(ctx, x, y, tx, ty, from) {
    ctx.fillStyle = K.dark; ctx.fillRect(x, y + from, 16, 16 - from);
    for (let j = from; j < 16; j++) {
      const Y = ty * 16 + j;
      for (let i = 0; i < 16; i++) {
        const X = tx * 16 + i;
        const a = ((X + Y) % 16 + 16) % 16, b = ((X - Y) % 16 + 16) % 16;
        if (a === 0 || b === 0) { ctx.fillStyle = K.brace; ctx.fillRect(x + i, y + j, 1, 1); }
      }
      if (Y % 16 === 15) hline(ctx, x, y + j, 16, K.brace);
    }
    if ((tx & 1) === 0) { ctx.fillStyle = K.w1; ctx.fillRect(x, y + from, 2, 16 - from); }
  }
  function puffs(ctx, x, y, tx) {
    for (let i = 0; i < 16; i++) {
      const X = tx * 16 + i;
      const top = 5 + Math.round(2.2 * Math.sin(X / 6) + 1.4 * Math.sin(X / 2.6));
      px(ctx, x + i, y + top - 1, K.c3);
      ctx.fillStyle = K.c1; ctx.fillRect(x + i, y + top, 1, 3);
      ctx.fillStyle = K.c2; ctx.fillRect(x + i, y + top + 3, 1, 16 - top - 3);
    }
  }

  // corrugated steel for raised structures
  function steel(ctx, x, y, tx, ty, from) {
    for (let i = 0; i < 16; i++) {
      const k = i & 3;
      ctx.fillStyle = k === 0 ? K.w3 : k === 3 ? K.w1 : K.w2;
      ctx.fillRect(x + i, y + from, 1, 16 - from);
    }
    if (ty % 2 === 0 && from === 0) hline(ctx, x, y + 8, 16, K.w1);
    if (hash2(tx, ty) < 0.1 && from === 0) { ctx.fillStyle = K.lamp; ctx.fillRect(x + 6, y + 10, 3, 2); }
  }

  // the walkway: a light steel plate over an orange-and-white edge stripe
  function deck(ctx, x, y, tx) {
    hline(ctx, x, y, 16, K.hi);
    ctx.fillStyle = K.plate; ctx.fillRect(x, y + 1, 16, 3);
    hline(ctx, x, y + 4, 16, K.plateLo);
    if (tx % 2 === 0) vline(ctx, x, y + 1, 4, K.seam);
    px(ctx, x + 5, y + 2, K.seam); px(ctx, x + 12, y + 2, K.seam);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = ((tx * 16 + i + r) >> 2) & 1 ? K.stripe : K.hi;
        ctx.fillRect(x + i, y + 5 + r, 1, 1);
      }
    }
    hline(ctx, x, y + 7, 16, K.shadow);
  }

  return {
    terrain(ctx, x, y, mask, tx, ty, map) {
      const m = map ? maskOf(map, tx, ty) : mask;
      const top = !(m & 1);
      if (ty < 11) {
        // raised structures: corrugated steel under a deck
        const from = top ? 8 : 0;
        steel(ctx, x, y, tx, ty, from);
        if (top) deck(ctx, x, y, tx);
        if (!(m & 8)) vline(ctx, x, y + from, 16 - from, K.w3);
        if (!(m & 2)) vline(ctx, x + 15, y + from, 16 - from, K.ink);
        if (!(m & 4)) hline(ctx, x, y + 15, 16, K.ink);
      } else {
        // the floor: deck, girder, truss, and cloud at the bottom
        let from = 0;
        if (top) { deck(ctx, x, y, tx); girder(ctx, x, y + 8, tx); from = 13; }
        else if (ty === 11) { girder(ctx, x, y, tx); from = 5; }
        truss(ctx, x, y, tx, ty, from);
        if (ty === map.rows - 1) puffs(ctx, x, y, tx);
        if (!(m & 8)) { vline(ctx, x, y + (top ? 8 : 0), 16 - (top ? 8 : 0), K.ink); vline(ctx, x + 1, y + (top ? 8 : 0), 16 - (top ? 8 : 0), K.w3); }
        if (!(m & 2)) { vline(ctx, x + 15, y + (top ? 8 : 0), 16 - (top ? 8 : 0), K.ink); vline(ctx, x + 14, y + (top ? 8 : 0), 16 - (top ? 8 : 0), K.w1); }
      }
      if (top) {
        if (!(m & 8)) vline(ctx, x, y, 8, K.ink);
        if (!(m & 2)) vline(ctx, x + 15, y, 8, K.ink);
      }
    },
    oneway(ctx, x, y, joinL, joinR) {
      // an orange catwalk with a grated top and a light truss
      hline(ctx, x, y, 16, K.hi);
      ctx.fillStyle = C('orange.2'); ctx.fillRect(x, y + 1, 16, 3);
      for (let i = 1; i < 16; i += 3) px(ctx, x + i, y + 2, C('orange.1'));
      hline(ctx, x, y + 4, 16, K.ink);
      for (let i = 0; i < 4; i++) { px(ctx, x + 2 + i, y + 5 + i, K.w2); px(ctx, x + 13 - i, y + 5 + i, K.w2); }
      if (!joinL) vline(ctx, x, y, 5, K.ink);
      if (!joinR) vline(ctx, x + 15, y, 5, K.ink);
    },
    animated(ctx, ch, x, y, t) {
      if (ch !== '<' && ch !== '>') return;
      const dir = ch === '>' ? 1 : -1;
      ctx.fillStyle = K.w1; ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = K.belt; ctx.fillRect(x, y, 16, 6);
      hline(ctx, x, y, 16, K.w3);
      const off = ((t >> 1) * dir) & 7;
      for (let i = -1; i < 3; i++) {
        const cx = x + ((i * 8 + off) & 15);
        if (cx < x || cx > x + 14) continue;
        px(ctx, cx, y + 2, K.chev); px(ctx, cx + dir, y + 3, K.chev); px(ctx, cx, y + 4, K.chev);
      }
      hline(ctx, x, y + 6, 16, K.ink);
      // rollers with a turning spoke
      for (const rx of [4, 12]) {
        ctx.fillStyle = K.ink; ctx.fillRect(x + rx - 3, y + 8, 6, 6);
        ctx.fillStyle = K.w3; ctx.fillRect(x + rx - 2, y + 9, 4, 4);
        const a = ((t >> 2) * dir) & 3;
        ctx.fillStyle = K.w1;
        if (a === 0 || a === 2) ctx.fillRect(x + rx - 2, y + 10, 4, 1); else ctx.fillRect(x + rx - 1, y + 9, 1, 4);
      }
      ctx.fillStyle = K.stripe; ctx.fillRect(x, y + 14, 16, 2);
    },
  };
}

// the Failure Gallery: wood floor, dark plum walls
function galleryKit() {
  const K = {
    wall: C('#2a2433'), wall2: C('#251f2e'), seam: C('#17131d'), hi: C('#f0dfc0'),
    floor: C('wood.2'), floor2: C('wood.3'), floorLo: C('wood.1'), dark: C('wood.0'), trim: C('cyan.2'), ink: C('ink.0'),
  };
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.fillStyle = (tx >> 1) & 1 ? K.wall : K.wall2; ctx.fillRect(x, y, 16, 16);
      if (tx % 2 === 0) vline(ctx, x, y, 16, K.seam);
      if (!(m & 1)) {
        hline(ctx, x, y, 16, K.hi);
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = ((tx * 16 + i) >> 3) & 1 ? K.floor : K.floor2;
          ctx.fillRect(x + i, y + 1, 1, 5);
        }
        for (let i = 0; i < 16; i += 8) vline(ctx, x + i, y + 1, 5, K.floorLo);
        hline(ctx, x, y + 6, 16, K.floorLo);
        hline(ctx, x, y + 7, 16, K.dark);
        hline(ctx, x, y + 10, 16, K.trim);
      }
      if (!(m & 8)) vline(ctx, x, y, 16, C('#3a3347'));
      if (!(m & 2)) vline(ctx, x + 15, y, 16, K.ink);
      if (!(m & 4)) hline(ctx, x, y + 15, 16, K.ink);
    },
    oneway(ctx, x, y, joinL, joinR) {
      hline(ctx, x, y, 16, K.hi);
      ctx.fillStyle = K.floor; ctx.fillRect(x, y + 1, 16, 3);
      hline(ctx, x, y + 4, 16, K.ink);
      if (!joinL) vline(ctx, x, y, 5, K.ink);
      if (!joinR) vline(ctx, x + 15, y, 5, K.ink);
    },
    animated() {},
  };
}

registerKit('labelFactory', factoryKit());
registerKit('labelGallery', galleryKit());

// ─── backdrops ───────────────────────────────────────────────────────

// clouds are unions of discs, drawn shadow first; wrapped so strips tile
function puff(ctx, w, cx, cy, r, lit, shade) {
  for (const ox of [-w, 0, w]) {
    disc(ctx, cx + ox, cy + 3, r, shade);
    disc(ctx, cx + ox, cy, r, lit);
  }
}

function factorySky(W) {
  const sky = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#2a62a8', '#3f86c8', '#6fb3e2', '#a9d8f0', '#e8f0ee', '#ffdcb4', '#ffc28e']);
    const r = rng(17);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 9; i++) {
      const x = Math.round(r() * W), y = Math.round(20 + r() * 56), w = Math.round(30 + r() * 60);
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x + 10, y + 2, Math.round(w * 0.6), 1);
    }
  });

  // a pale cumulus bank on the horizon
  const far = strip(640, (ctx, w) => {
    const r = rng(5);
    for (let i = 0; i < 16; i++) {
      puff(ctx, w, r() * w, 128 + r() * 22, 9 + Math.round(r() * 14), '#fbeee2', '#ecd2c0');
    }
    ctx.fillStyle = C('#fbeee2'); ctx.fillRect(0, 142, w, H - 142);
  });

  // floating factory islands: sawtooth halls, chimneys, lit windows
  const chimneys = [];
  const islands = strip(896, (ctx, w) => {
    const r = rng(23);
    const body = C('#8ea2c6'), dark = C('#7184aa'), glass = C('#b9d6ee'), lit = C('orange.3');
    let x = 24;
    while (x < w - 140) {
      const iw = 76 + Math.floor(r() * 56), base = 118 + Math.floor(r() * 18);
      for (let k = 0; k <= iw; k += 9) {
        const rr = 7 + Math.floor(r() * 4);
        disc(ctx, x + k, base + 6 + rr / 2, rr, '#c9d5ea');
        disc(ctx, x + k, base + 4 + rr / 2, rr, '#e6edf8');
      }
      const bx = x + 8, bw = iw - 16, bh = 12 + Math.floor(r() * 10), top = base - bh;
      ctx.fillStyle = body; ctx.fillRect(bx, top, bw, bh + 4);
      for (let s = 0; s + 12 <= bw; s += 12) {
        for (let j = 0; j < 12; j++) {
          const hgt = Math.floor(j / 2);
          ctx.fillStyle = body; ctx.fillRect(bx + s + j, top - hgt, 1, hgt);
        }
        ctx.fillStyle = glass; ctx.fillRect(bx + s + 11, top - 5, 1, 5);
      }
      ctx.fillStyle = dark; ctx.fillRect(bx, top + bh, bw, 4);
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) { ctx.fillStyle = r() < 0.5 ? lit : glass; ctx.fillRect(wx, top + 4, 3, 3); }
      const cx = bx + 6 + Math.floor(r() * (bw - 16)), ch = 14 + Math.floor(r() * 10);
      ctx.fillStyle = dark; ctx.fillRect(cx, top - 6 - ch, 5, ch + 6);
      ctx.fillStyle = C('orange.2'); ctx.fillRect(cx, top - 6 - ch + 3, 5, 2);
      chimneys.push({ x: cx + 2, y: top - 6 - ch, seed: Math.floor(r() * 100) });
      x += iw + 50 + Math.floor(r() * 70);
    }
  });

  // the cloud sea everything floats on (what you see down a pit)
  const sea = strip(512, (ctx, w) => {
    const r = rng(31);
    const rows = [
      { y: 178, lit: '#eef2fa', shade: '#cdd8ec', n: 9, a: 12, b: 18 },
      { y: 194, lit: '#f8f9fd', shade: '#d9e2f0', n: 11, a: 10, b: 16 },
      { y: 207, lit: '#ffffff', shade: '#e2e8f3', n: 12, a: 9, b: 14 },
    ];
    for (const row of rows) {
      for (let i = 0; i < row.n; i++) puff(ctx, w, (i + r() * 0.7) * (w / row.n), row.y, row.a + Math.round(r() * (row.b - row.a)), row.lit, row.shade);
      ctx.fillStyle = C(row.lit); ctx.fillRect(0, row.y + 4, w, H - row.y - 4);
    }
  });

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, far, camX, 0.05 * k, -camY * 0.05);
      const fy = -camY * 0.1;
      blitStrip(ctx, islands, camX, 0.15 * k, fy);
      if (!reduced) {
        // chimney smoke, drawn live so it rises
        let x0 = -Math.floor(camX * 0.15) % islands.width;
        if (x0 > 0) x0 -= islands.width;
        ctx.save();
        for (let sx = x0; sx < ctx.W; sx += islands.width) {
          for (const c of chimneys) {
            const bx = sx + c.x;
            if (bx < -30 || bx > ctx.W + 30) continue;
            for (let p = 0; p < 4; p++) {
              const a = ((t * 0.4 + p * 30 + c.seed) % 120) / 120;
              ctx.globalAlpha = 0.55 * (1 - a);
              disc(ctx, bx + a * 14, c.y + fy - a * 34, 2 + Math.round(a * 4), '#f4f6fb');
            }
          }
        }
        ctx.restore();
      }
      blitStrip(ctx, sea, camX, 0.32 * k, -camY * 0.3);
    },
  };
}

function galleryRoom(W) {
  const bg = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#1a1622', '#221d2b', '#2a2434']);
    ctx.fillStyle = C('#3d3650'); ctx.fillRect(0, 22, W, 3);         // ceiling track for the spotlights
    ctx.fillStyle = C('#1a1622'); ctx.fillRect(0, 136, W, 40);       // wainscot
    ctx.fillStyle = C('#3a3347'); ctx.fillRect(0, 136, W, 1);
    for (let x = 0; x < W; x += 32) { ctx.fillStyle = C('#14111a'); ctx.fillRect(x, 137, 1, 39); }
  });
  return { draw(ctx, camX) { blitStrip(ctx, bg, camX, 1); } };
}

registerBackground('labelFactory', factorySky);
registerBackground('labelGallery', galleryRoom);

// ─── image cards: tiny pictures that training data is made of ────────

const PICS = {
  cat: { legend: { s: 'cyan.3', a: 'orange.2', e: 'ink.0', n: 'magenta.3', w: 'white.2' }, map: `
sassssssssas
saassssssaas
saaaaaaaaaas
aaeaaaaaaeaa
aaaaannaaaaa
waaaaaaaaaaw
saaaaaaaaaas
ssaaaaaaaass` },
  tree: { legend: { s: 'cyan.3', g: 'green.2', G: 'green.3', t: 'wood.1', h: 'green.1' }, map: `
ssssggggssss
sssggGGgggss
ssggGgggggss
ssggggggggss
sssggggggsss
sssssttsssss
sssssttsssss
hhhhhhhhhhhh` },
  fish: { legend: { w: 'cyan.2', F: 'orange.1', f: 'orange.3', e: 'ink.0', b: 'white.2' }, map: `
wwwwwwwwwbww
wwwFFFFwwwww
wwFffffFwwFw
wFeffffffFFw
wFffffffffFw
wwFffffFwwFw
wwwFFFFwwwww
wwwwwwwwwwww` },
  sun: { legend: { s: 'cyan.3', y: 'gold.3', Y: 'gold.2' }, map: `
sssssYYsssss
sYssyyyyssYs
sssyyyyyysss
YYsyyyyyysYY
YYsyyyyyysYY
sssyyyyyysss
sYssyyyyssYs
sssssYYsssss` },
};
const picCache = {};
function pic(name) {
  if (!picCache[name]) picCache[name] = compileMap(PICS[name].map, PICS[name].legend, 'pic:' + name);
  return picCache[name];
}

// a 16×12 card: white border, picture inset
function drawCard(ctx, x, y, name, flat = false) {
  x = Math.round(x); y = Math.round(y);
  if (flat) {
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y + 7, 18, 6);
    ctx.fillStyle = C('white.2'); ctx.fillRect(x, y + 8, 16, 4);
    ctx.drawImage(pic(name), 0, 2, 12, 4, x + 2, y + 8, 12, 3);
    return;
  }
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, 18, 14);
  ctx.fillStyle = C('white.2'); ctx.fillRect(x, y, 16, 12);
  ctx.fillStyle = C('white.0'); ctx.fillRect(x, y + 11, 16, 1);
  ctx.drawImage(pic(name), x + 2, y + 2);
}

// the label hanging off a card
function drawTag(ctx, cx, y, text, good) {
  const w = Math.ceil(textWidth(text, 6.5, 700)) + 8, h = lineHeight(6.5) + 2;
  const x = Math.round(cx - w / 2);
  pill(ctx, x, y, w, h, good ? '#e9fbe9' : '#fbf8f1', INK, 2);
  drawText(ctx, text, cx, y + 1, good ? '#1d6b43' : '#c4282e', { align: 'center', size: 6.5, weight: 700 });
  return h;
}

// ─── mislabels: cards walking around with the wrong tag ─────────────

const MISLABELS = [['cat', 'dog'], ['tree', 'car'], ['fish', 'bird'], ['sun', 'moon']];

class Mislabel extends Enemy {
  constructor(tx, ty, skin, level) {
    super(tx * TILE + 1, (ty + 1) * TILE - 14, 14, 14);
    const n = level ? level.enemies.filter((e) => e instanceof Mislabel).length : 0;
    [this.pic, this.wrong] = MISLABELS[n % MISLABELS.length];
  }
  reset() { super.reset(); this.dir = -1; this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 70) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.vx = this.dir * 0.4;
    this.vy = Math.min(this.vy + 0.4, 4);
    const map = level.map;
    if (this.grounded) {
      const fx = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const below = map.flag(Math.floor(fx / TILE), Math.floor((this.y + this.h + 2) / TILE));
      if (!(below & (SOLID | ONEWAY))) this.dir = -this.dir;
    }
    const res = moveBody(this, map, level.platforms);
    if (res.wall) this.dir = -res.wall;
    if (this.y > map.h + 32) this.alive = false;
  }
  stomp(level) {
    this.flat = 1;
    const x = this.x + this.w / 2;
    level.stats.bugs++;
    level.game.progress.stat('bugs');
    level.sfx('stomp');
    level.floaters.push(new Floater(x, this.y - 18, 'Audited ✓', '#90eaa8', 50));
    level.game.particles.burst(x, this.y + 6, 8, [C('green.3'), C('white.2'), C('orange.3')], { speed: 1.4, up: 1, life: 20 });
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    const cx = x + 7;
    if (this.flat) {
      drawCard(ctx, x - 1, y + 2, this.pic, true);
      drawTag(ctx, cx, y - 4, this.pic + ' ✓', true);
      return;
    }
    const bob = (this.t >> 3) & 1;
    // little legs
    ctx.fillStyle = INK;
    ctx.fillRect(x + 2 + bob, y + 12, 2, 2); ctx.fillRect(x + 10 - bob, y + 12, 2, 2);
    drawCard(ctx, x - 1, y - bob, this.pic);
    // the tag on its string, swinging a little
    const sw = Math.round(Math.sin(this.t / 12) * 1.5);
    ctx.fillStyle = C('slate.3'); ctx.fillRect(cx + sw, y - 4 - bob, 1, 4);
    drawTag(ctx, cx + sw, y - 14 - bob, this.wrong, false);
  }
}

// ─── noise clouds: drifting static ───────────────────────────────────

const NOISE = ['#2b2f3d', '#4c5368', '#6f7890', '#9aa3b8', '#c3cad8', '#e9edf4', '#3cc0e8', '#f07a1f'];
const nhash = (i, f) => {
  let v = Math.imul(i + 1, 2654435761) ^ Math.imul(f + 7, 40503);
  v = Math.imul(v ^ (v >>> 15), 2246822519);
  return (v ^ (v >>> 13)) >>> 0;
};
// greys mostly, the odd coloured fleck
const noiseCol = (i, f) => { const h = nhash(i, f); return NOISE[(h & 15) < 14 ? (h >>> 4) % 6 : 6 + ((h >>> 4) & 1)]; };

const CLOUD_MASK = (() => {
  const w = 24, h = 17, m = new Uint8Array(w * h);
  const blobs = [[6, 10, 5.6], [12, 7, 6.8], [18, 10, 5.6], [12, 11.5, 5.2]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (blobs.some(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r)) m[y * w + x] = 1;
  }
  return { w, h, m };
})();
// the cloud's static is darker than the sky so it stands out against it
const DARK_NOISE = ['#2b2f3d', '#3a4054', '#4c5368', '#5f6880', '#7c86a0', '#2b2f3d'];
const cloudCol = (k, f) => { const h = nhash(k, f); return (h & 31) < 3 ? '#e9edf4' : (h & 31) < 4 ? '#3cc0e8' : DARK_NOISE[(h >>> 5) % 6]; };

class NoiseCloud extends Enemy {
  constructor(tx, ty) { super(tx * TILE - 1, ty * TILE + 1, 18, 13); }
  reset() { super.reset(); this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 26) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.x = this.spawnX - Math.sin(this.t / 80) * 36;
    this.y = this.spawnY + Math.sin(this.t / 20) * 5;
  }
  stomp(level) {
    this.flat = 1;
    const x = this.x + this.w / 2;
    level.stats.bugs++;
    level.game.progress.stat('bugs');
    level.sfx('stomp');
    level.floaters.push(new Floater(x, this.y - 8, 'Denoised', '#a8ecff', 46));
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x) - 3, y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y) - 3;
    const { w, h, m } = CLOUD_MASK;
    const f = t >> 1;
    // outline, then static inside; a stomp resolves it to a clean puff
    ctx.fillStyle = INK;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!m[j * w + i]) continue;
      if (!m[(j - 1) * w + i] || !m[(j + 1) * w + i] || !m[j * w + i - 1] || !m[j * w + i + 1] || j === 0 || j === h - 1 || i === 0 || i === w - 1) ctx.fillRect(x + i, y + j, 1, 1);
    }
    const clean = this.flat ? Math.min(1, this.flat / 10) : 0;
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      if (!m[k] || !m[k - w] || !m[k + w] || !m[k - 1] || !m[k + 1]) continue;
      ctx.fillStyle = (nhash(k, 3) & 255) / 255 < clean ? (j < 8 ? '#ffffff' : '#e3e6ee') : cloudCol(k, f);
      ctx.fillRect(x + i, y + j, 1, 1);
    }
    if (this.flat) return;
    // eyes that follow the hero
    const h0 = level.hero, look = h0.x + 5 < this.x + 7 ? -1 : 1;
    for (const ex of [8, 14]) {
      ctx.fillStyle = INK; ctx.fillRect(x + ex - 1, y + 6, 5, 6);
      ctx.fillStyle = '#fbf8f1'; ctx.fillRect(x + ex, y + 7, 3, 4);
      ctx.fillStyle = INK; ctx.fillRect(x + ex + (look > 0 ? 1 : 0), y + 8, 2, 2);
    }
  }
}

registerEnemy('m', Mislabel);
registerEnemy('z', NoiseCloud);

// ─── decor: the factory gate ─────────────────────────────────────────

class Gate {
  constructor(tx, ty, spec, level) {
    this.x = tx * TILE; this.y = ty * TILE; this.w = spec.w * TILE;
    this.text = spec.text; this.sub = spec.sub;
    this.floor = floorBelow(level.map, tx, ty);
  }
  back(ctx, cam, t) {
    if (!onScreen(this.x, this.w, cam, ctx)) return;
    const x = this.x - cam.x, y = this.y - cam.y, w = this.w, f = this.floor - cam.y;
    for (const p of [x + 6, x + w - 12]) {
      ctx.fillStyle = INK; ctx.fillRect(p - 1, y + 4, 8, f - y - 4);
      ctx.fillStyle = C('orange.1'); ctx.fillRect(p, y + 4, 6, f - y - 4);
      ctx.fillStyle = C('orange.2'); ctx.fillRect(p + 1, y + 4, 3, f - y - 4);
      ctx.fillStyle = C('orange.3'); ctx.fillRect(p + 1, y + 4, 1, f - y - 4);
      for (let yy = y + 40; yy < f - 6; yy += 14) { ctx.fillStyle = C('orange.1'); ctx.fillRect(p, yy, 6, 1); }
    }
    const l1 = lineHeight(10), l2 = lineHeight(7);
    const h = 5 + l1 + l2 + 8;
    pill(ctx, x, y, w, h, '#fbf8f1', INK, 3);
    drawText(ctx, this.text, x + w / 2, y + 4, '#1b1e2b', { align: 'center', size: 10, weight: 700 });
    drawText(ctx, this.sub, x + w / 2, y + 4 + l1, '#b2470f', { align: 'center', size: 7, weight: 600 });
    ctx.fillStyle = C('orange.2'); ctx.fillRect(x + 3, y + h - 5, w - 6, 2);
    // running lights along the top
    for (let i = 8; i < w - 8; i += 8) {
      ctx.fillStyle = ((i / 8 + (t >> 3)) & 3) === 0 ? C('cyan.3') : C('cyan.1');
      ctx.fillRect(x + i, y - 2, 2, 2);
    }
  }
}

// ─── the audit line: cards on a belt, a rubric, a stamp press ───────
// The press checks the card under it against the rubric (rows tick one
// by one while it winds up), then stamps Pass or Flag. Its head hurts on
// the way down and while it rests on the belt; the wind-up shakes and
// flashes the lamp for 40 frames first.

const BELT_CARDS = [['cat', 'cat'], ['tree', 'car'], ['fish', 'fish'], ['sun', 'moon'], ['tree', 'tree'], ['cat', 'dog']];

class Audit {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE;                       // press head: two tiles from here
    this.top = ty * TILE;                     // gantry crossbeam
    this.floor = floorBelow(level.map, tx, ty);
    this.belt0 = spec.belt[0] * TILE; this.belt1 = spec.belt[1] * TILE;
    this.rubric = spec.rubric;                // { dx, dy, title, rows }
    this.P = spec.period || 150;
    this.ph = { warn: 64, slam: 104, hold: 110, rise: 128 };   // frame offsets within a period
    this.restY = this.floor - 64;             // head bottom when up
    this.t = 0;
    this.cards = [];
    this.n = 0;
    this.speed = TUNING.conveyor;
    this.cx = this.x + 16;
    const travel = Math.round((this.cx - (this.belt0 + 8)) / this.speed);
    this.spawnAt = (((this.ph.hold - travel) % this.P) + this.P) % this.P;
    for (let i = 0; i < this.P * 3; i++) this.tick(false);  // start with a full belt
  }

  phase() { return this.t % this.P; }

  headBottom() {
    const p = this.phase(), { slam, hold, rise } = this.ph;
    if (p < slam) return this.restY;
    if (p < hold) return lerp(this.restY, this.floor, ((p - slam) / (hold - slam)) ** 2);
    if (p < rise) return this.floor;
    return lerp(this.floor, this.restY, ease.outCubic((p - rise) / (this.P - rise)));
  }

  current() {
    // the card that the next stamp lands on: the first not yet stamped
    return this.cards.find((c) => !c.stamp && c.x + 8 < this.cx + 40);
  }

  tick(live) {
    this.t++;
    const p = this.phase();
    if (p === this.spawnAt) {
      const [pic0, tag] = BELT_CARDS[this.n++ % BELT_CARDS.length];
      this.cards.push({ x: this.belt0, pic: pic0, tag, ok: pic0 === tag, stamp: null, drop: 0, vy: 0 });
    }
    for (const c of this.cards) {
      if (c.x < this.belt1 - 8) c.x += this.speed;
      else { c.drop++; c.x += 0.4; c.vy += 0.25; }
    }
    this.cards = this.cards.filter((c) => c.drop < 30);
    if (p === this.ph.hold) {
      const c = this.cards.find((k) => Math.abs(k.x + 8 - this.cx) < 12 && !k.stamp);
      if (c) c.stamp = c.ok ? 'Pass' : 'Flag';
      if (live && this.near()) { this.level.camera.shake(0.12); this.level.sfx('bump'); }
    }
    if (p === this.ph.warn) {
      this.judged = this.current();
      if (live && this.near()) this.level.sfx('tick');
    }
  }

  near() { const L = this.level; return Math.abs(this.cx - L.camX - L.W / 2) < L.W * 0.6; }

  update(level) {
    this.tick(true);
    const p = this.phase(), hb = this.headBottom();
    const deadly = (p >= this.ph.slam && p < this.ph.rise) || (p >= this.ph.rise && hb > this.floor - 26);
    if (deadly) {
      const head = { x: this.x + 2, y: hb - 14, w: 28, h: 14 };
      if (overlaps(level.hero, head)) level.hurtHero(this.cx);
    }
    if (p >= this.ph.warn && p < this.ph.slam && (p & 7) === 0 && this.near()) {
      level.game.particles.one(this.x + 2, hb - 10, -0.4, -0.3, C('white.1'), 18, 0, 1);
      level.game.particles.one(this.x + 30, hb - 10, 0.4, -0.3, C('white.1'), 18, 0, 1);
    }
  }

  back(ctx, cam, t) {
    const x = this.x - cam.x, top = this.top - cam.y, f = this.floor - cam.y;
    if (this.rubric) this.drawRubric(ctx, cam);
    if (!onScreen(this.belt0 - 16, this.belt1 - this.belt0 + 48, cam, ctx)) return;
    // gantry posts and crossbeam
    for (const p of [x - 6, x + 34]) {
      ctx.fillStyle = INK; ctx.fillRect(p - 1, top, 6, f - top);
      ctx.fillStyle = C('steel.3'); ctx.fillRect(p, top, 4, f - top);
      ctx.fillStyle = C('steel.4'); ctx.fillRect(p, top, 1, f - top);
    }
    ctx.fillStyle = INK; ctx.fillRect(x - 8, top - 1, 50, 9);
    ctx.fillStyle = C('orange.2'); ctx.fillRect(x - 7, top, 48, 7);
    ctx.fillStyle = C('orange.3'); ctx.fillRect(x - 7, top, 48, 1);
    // the bin at the end of the belt
    const bx = this.belt1 - cam.x + 2;
    ctx.fillStyle = INK; ctx.fillRect(bx - 1, f - 19, 30, 19);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(bx, f - 18, 28, 18);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(bx, f - 18, 28, 1);
    drawText(ctx, 'Audited', bx + 14, f - 13, '#e3e6ee', { align: 'center', size: 6, weight: 700 });
    // cards riding the belt
    for (const c of this.cards) {
      const cx = c.x - cam.x, cy = this.floor - 13 - cam.y + c.drop * c.vy * 0.5;
      if (c.drop > 0 && cy > f - 8) continue;      // into the bin
      drawCard(ctx, cx, cy, c.pic);
      if (c.stamp) {
        // stamped: the card gets a coloured rim and the verdict replaces the tag
        const good = c.stamp === 'Pass', rim = good ? C('green.2') : C('red.2');
        ctx.fillStyle = rim;
        ctx.fillRect(cx - 1, cy - 1, 18, 1); ctx.fillRect(cx - 1, cy + 12, 18, 1);
        ctx.fillRect(cx - 1, cy - 1, 1, 14); ctx.fillRect(cx + 16, cy - 1, 1, 14);
        const w = Math.ceil(textWidth(c.stamp, 6.5, 700)) + 8, h = lineHeight(6.5) + 2;
        pill(ctx, Math.round(cx + 8 - w / 2), cy - 13, w, h, good ? '#1d6b43' : '#c4282e', INK, 2);
        drawText(ctx, c.stamp, cx + 8, cy - 12, '#fbf8f1', { align: 'center', size: 6.5, weight: 700 });
      } else {
        ctx.fillStyle = C('slate.3'); ctx.fillRect(cx + 8, cy - 3, 1, 3);
        drawTag(ctx, cx + 8, cy - 13, c.tag, false);
      }
    }
  }

  draw(ctx, cam, t) {
    if (!onScreen(this.x - 10, 52, cam, ctx)) return;
    const p = this.phase(), hb = this.headBottom();
    const warn = p >= this.ph.warn && p < this.ph.slam;
    const shake = warn && !this.level.game.reduced ? ((t >> 1) & 1 ? 1 : -1) : 0;
    const x = this.x - cam.x + shake, top = this.top - cam.y, y = hb - cam.y;
    // piston rod
    ctx.fillStyle = INK; ctx.fillRect(x + 12, top + 7, 8, y - 14 - top - 7);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 13, top + 7, 6, y - 14 - top - 7);
    ctx.fillStyle = C('white.1'); ctx.fillRect(x + 14, top + 7, 1, y - 14 - top - 7);
    // head
    ctx.fillStyle = INK; ctx.fillRect(x + 1, y - 15, 30, 15);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 2, y - 14, 28, 9);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 2, y - 14, 28, 1);
    ctx.fillStyle = C('orange.2'); ctx.fillRect(x + 2, y - 9, 28, 3);
    ctx.fillStyle = C('#3a2a2a'); ctx.fillRect(x + 3, y - 4, 26, 4);       // rubber stamp face
    // warning lamp on the crossbeam
    const lit = warn ? ((t >> 2) & 1) : 0;
    ctx.fillStyle = INK; ctx.fillRect(this.cx - cam.x - 4, top - 6, 8, 6);
    ctx.fillStyle = lit ? C('red.3') : C('red.1'); ctx.fillRect(this.cx - cam.x - 3, top - 5, 6, 5);
    if (lit) { ctx.fillStyle = 'rgba(255,90,80,0.25)'; ctx.fillRect(this.cx - cam.x - 9, top - 10, 18, 14); }
  }

  drawRubric(ctx, cam) {
    const R = this.rubric;
    const x = this.x + R.dx * TILE - cam.x, y = this.top + R.dy * TILE - cam.y;
    const w = 96, lh = lineHeight(6.5);
    const h = 18 + R.rows.length * (lh + 2) + 4;
    if (x > ctx.W + 4 || x + w < -4) return;
    // board on a stand
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + w / 2 - 1, y + h, 3, this.floor - cam.y - y - h);
    pill(ctx, x, y, w, h, C('wood.2'), INK, 3);
    pill(ctx, x + 4, y + 5, w - 8, h - 9, '#fbf8f1', null, 2);
    ctx.fillStyle = INK; ctx.fillRect(x + w / 2 - 9, y - 1, 18, 6);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + w / 2 - 8, y, 16, 4);
    drawText(ctx, R.title, x + w / 2, y + 6, '#1b1e2b', { align: 'center', size: 7, weight: 700 });
    // rows tick while the press winds up, for the card under it
    const p = this.phase(), c = this.judged;
    R.rows.forEach((row, i) => {
      const ry = y + 17 + i * (lh + 2);
      ctx.fillStyle = INK; ctx.fillRect(x + 9, ry + 2, 7, 7);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 10, ry + 3, 5, 5);
      const shown = p >= this.ph.warn + i * 12 && p < this.ph.rise + 12;
      if (shown && c) {
        const pass = i !== 0 || c.ok;
        drawText(ctx, pass ? '✓' : '✗', x + 12.5, ry, pass ? '#1d6b43' : '#c4282e', { align: 'center', size: 7, weight: 700 });
      }
      drawText(ctx, row, x + 20, ry + 1, '#343645', { size: 6.5, weight: 600 });
    });
  }
}

// ─── denoise: platforms that resolve out of pure noise ───────────────
// fact mode: hitting the DENOISE block runs 20 steps for the whole chain.
// auto mode (the fine-tuned model): each piece denoises as you approach.

const hexOf = (d, i) => '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);

function bake(c) {
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const cols = new Array(c.width * c.height);
  for (let i = 0; i < cols.length; i++) cols[i] = d[i * 4 + 3] > 0 ? hexOf(d, i * 4) : null;
  return cols;
}

// a rope bridge: posts and sagging ropes above, planks at `top`
function bridgeArt(w) {
  const h = 19, top = 12;
  const [c, ctx] = makeCanvas(w, h);
  for (let x = 0; x <= w - 2; x += 32) {
    const p = Math.min(w - 3, x);
    ctx.fillStyle = C('wood.0'); ctx.fillRect(p, 1, 3, top);
    ctx.fillStyle = C('wood.2'); ctx.fillRect(p + 1, 1, 1, top - 1);
  }
  for (let x = 0; x < w; x++) {
    const sag = Math.round(Math.sin(((x % 32) / 32) * Math.PI) * 3);
    ctx.fillStyle = C('gold.1'); ctx.fillRect(x, 3 + sag, 1, 1);
  }
  for (let x = 0; x < w; x += 4) {
    ctx.fillStyle = C((x >> 2) % 3 === 0 ? 'wood.3' : 'wood.2'); ctx.fillRect(x, top, 3, 4);
    ctx.fillStyle = C('wood.0'); ctx.fillRect(x, top + 4, 3, 1);
  }
  ctx.fillStyle = C('gold.1'); ctx.fillRect(0, top + 5, w, 1);
  return { c, h, top };
}

// a stepping stone
function stoneArt(w) {
  const h = 10, top = 0;
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = C('#5d667c'); ctx.fillRect(1, 0, w - 2, h); ctx.fillRect(0, 1, w, h - 2);
  ctx.fillStyle = C('#9aa4b8'); ctx.fillRect(1, 1, w - 2, h - 3);
  ctx.fillStyle = C('#c9d0dc'); ctx.fillRect(1, 1, w - 2, 2);
  ctx.fillStyle = C('green.2'); ctx.fillRect(2, 0, 5, 1); ctx.fillRect(w - 9, 0, 6, 1);
  ctx.fillStyle = C('#77819a'); ctx.fillRect(Math.round(w / 3), 4, 1, 3); ctx.fillRect(Math.round(w / 3) + 1, 6, 3, 1);
  return { c, h, top };
}

class Denoise {
  constructor(tx, ty, spec, level, key) {
    this.level = level; this.key = key;
    this.fact = spec.fact; this.auto = !!spec.auto;
    this.prompt = spec.prompt; this.title = spec.title || 'Prompt';
    this.panel = spec.panel ? { x: (tx + spec.panel[0]) * TILE, y: (ty + spec.panel[1]) * TILE } : null;
    const r = rng(tx * 131 + ty);
    this.segs = spec.segs.map(([dx, dy, len]) => {
      const x = (tx + dx) * TILE, y = (ty + dy) * TILE, w = len * TILE;
      const art = spec.img === 'stones' ? stoneArt(w) : bridgeArt(w);
      const n = art.c.width * art.c.height;
      const thr = new Float32Array(n);
      for (let i = 0; i < n; i++) thr[i] = 0.02 + r() * 0.96;
      const s = { x, y, w, art, cols: bake(art.c), thr, p: 0, run: false, plat: platform(x, y, w, 4, false), noise: [] };
      // a few cached frames of pure static
      for (let k = 0; k < 4; k++) {
        const [nc, nctx] = makeCanvas(art.c.width, art.c.height);
        for (let i = 0; i < n; i++) { nctx.fillStyle = noiseCol(i, k * 17 + tx); nctx.fillRect(i % art.c.width, Math.floor(i / art.c.width), 1, 1); }
        s.noise.push(nc);
      }
      level.platforms.push(s.plat);
      return s;
    });
    this.x0 = this.segs[0].x;
    this.x1 = Math.max(...this.segs.map((s) => s.x + s.w));
    const done = this.auto ? level.state.built.has(key) : level.game.progress.hasFact(this.fact);
    if (done) for (const s of this.segs) { s.p = 1; s.plat.active = true; }
    this.doneT = done ? 999 : 0;
  }

  get p() { return Math.min(...this.segs.map((s) => s.p)); }

  onFact(id, level) {
    if (this.auto || id !== this.fact || this.p >= 1) return;
    for (const s of this.segs) s.run = true;
    level.sfx('build');
  }

  update(level) {
    const h = level.hero;
    for (const s of this.segs) {
      if (this.auto && !s.run && s.p < 1 && h.x + h.w / 2 > s.x - 88) { s.run = true; level.sfx('tick'); }
      if (!s.run) continue;
      // quantized: 20 steps, 3 frames each (fine-tuned: 1 frame each)
      s.p = Math.min(1, s.p + (this.auto ? 1 / 20 : 1 / 60));
      if (s.p >= 1) {
        s.run = false; s.plat.active = true;
        level.game.particles.burst(s.x + s.w / 2, s.y, 8, [C('white.2'), C('cyan.3'), C('gold.3')], { speed: 1.2, up: 0.8, life: 18 });
        if (!this.auto) level.sfx('checkpoint');
      }
    }
    if (this.p >= 1) {
      this.doneT++;
      if (this.auto) level.state.built.add(this.key);
    }
  }

  back(ctx, cam, t) {
    const P = this.panel;
    if (!P || !onScreen(P.x - 60, 220, cam, ctx)) return;
    const s1 = 6.5, s2 = 7.5;
    const quote = '“' + this.prompt + '”';
    const w = Math.ceil(Math.max(textWidth(this.title, s1, 700), textWidth(quote, s2, 600))) + 16;
    const h = 5 + lineHeight(s1) + lineHeight(s2) + 5;
    const x = Math.round(P.x - cam.x - w / 2), y = P.y - cam.y;
    const f = floorBelow(this.level.map, Math.floor(P.x / TILE), Math.floor(P.y / TILE) + 2) - cam.y;
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + w / 2 - 1, y + h, 3, f - y - h);
    pill(ctx, x, y, w, h, '#14203a', '#3cc0e8', 3);
    drawText(ctx, this.title, x + 7, y + 4, '#6fd6c8', { size: s1, weight: 700 });
    drawText(ctx, quote, x + 7, y + 4 + lineHeight(s1), '#fbf8f1', { size: s2, weight: 600 });
  }

  draw(ctx, cam, t) {
    if (!onScreen(this.x0, this.x1 - this.x0, cam, ctx)) return;
    const f = t >> 2;
    for (const s of this.segs) {
      const { c, top } = s.art, w = c.width, hh = c.height;
      const x = s.x - cam.x, y = s.y - top - cam.y;
      const step = Math.floor(s.p * 20) / 20;
      if (step >= 1) { ctx.drawImage(c, x, y); continue; }
      if (step <= 0) {
        // pure noise: see-through and jittery, so it reads as not solid
        ctx.save(); ctx.globalAlpha = 0.72;
        ctx.drawImage(s.noise[f & 3], x, y + (((f >> 1) & 1) ? 1 : 0));
        ctx.restore();
        continue;
      }
      const ff = t >> 1;
      for (let j = 0; j < hh; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i;
          if (s.thr[k] < step) {
            const cc = s.cols[k];
            if (!cc) continue;
            ctx.fillStyle = cc;
          } else {
            ctx.fillStyle = noiseCol(k, ff);
          }
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
    // status over the chain
    if (this.auto) return;
    const cx = (this.x0 + this.x1) / 2 - cam.x, ly = this.segs[0].y - this.segs[0].art.top - cam.y - 24;
    const p = this.p;
    let label, color;
    if (p >= 1) { label = this.doneT < 150 ? 'Step 20/20 · on prompt ✓' : 'Rated: on prompt ✓'; color = '#90eaa8'; }
    else if (this.segs[0].run) { label = 'Denoising · step ' + Math.floor(p * 20) + '/20'; color = '#a8ecff'; }
    else { label = 'Pure noise · hit >_ to denoise'; color = '#ffd166'; }
    drawText(ctx, label, cx, ly, color, { align: 'center', shadow: INK, size: 7.5, weight: 700 });
  }
}

// ─── the Failure Gallery ─────────────────────────────────────────────
// Broken generations, each with the prompt it failed and the recurring
// flaw. Hitting the feedback block sends a note to each frame and the
// model regenerates it: broken → noise → fixed.

function paintHand(ctx, w, h, fingers) {
  stripedSky(ctx, w, h, ['#d9d2f2', '#c1b8e6']);
  const skin = C('skin.3'), shade = C('skin.2'), line = C('skin.0');
  const n = fingers, pitch = 5, fw = 3, span = n * pitch - 2;
  const px0 = Math.round(w / 2 - span / 2) + 3, palmTop = 21, palmH = 12;
  const tall = n === 5 ? [11, 15, 16, 15, 12] : [10, 13, 15, 15, 13, 10];
  const thumb = (c, grow) => {
    for (let j = 0; j < 8; j++) {
      const tx0 = px0 - 6 + Math.floor(j / 2);
      ctx.fillStyle = c; ctx.fillRect(tx0 - grow, palmTop + 2 + j - (j === 0 ? grow : 0), 4 + grow * 2, 1);
    }
  };
  // silhouette first, then fills, so every finger keeps a dark gap
  ctx.fillStyle = line;
  ctx.fillRect(px0 - 1, palmTop - 1, span + 2, palmH + 2);
  ctx.fillRect(px0 + 3, palmTop + palmH, span - 6, h - palmTop - palmH);
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch - 1, palmTop - tall[i] - 1, fw + 2, tall[i] + 2);
  thumb(line, 1);
  ctx.fillStyle = skin;
  ctx.fillRect(px0, palmTop, span, palmH);
  ctx.fillRect(px0 + 4, palmTop + palmH, span - 8, h - palmTop - palmH);
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch, palmTop - tall[i], fw, tall[i] + 1);
  thumb(skin, 0);
  ctx.fillStyle = shade; ctx.fillRect(px0, palmTop + palmH - 4, span, 4);
  ctx.fillStyle = C('white.1');
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch + 1, palmTop - tall[i] + 1, 1, 2);
}

function paintSign(ctx, w, h) {
  stripedSky(ctx, w, h, ['#8fd0f0', '#cfeefa']);
  ctx.fillStyle = C('grass.2'); ctx.fillRect(0, h - 7, w, 7);
  ctx.fillStyle = C('grass.3'); ctx.fillRect(0, h - 7, w, 1);
  ctx.fillStyle = C('wood.0'); ctx.fillRect(w / 2 - 2, 26, 4, h - 30);
  ctx.fillStyle = INK; ctx.fillRect(5, 5, w - 10, 22);
  ctx.fillStyle = C('wood.3'); ctx.fillRect(6, 6, w - 12, 20);
  ctx.fillStyle = C('wood.2'); ctx.fillRect(6, 23, w - 12, 3);
}

function paintCube(ctx, w, h, ramp) {
  stripedSky(ctx, w, h, ['#e3e6ee', '#b9c0cf']);
  ctx.fillStyle = 'rgba(11,13,23,0.18)'; ctx.fillRect(w / 2 - 16, h - 8, 32, 3);
  const cx = Math.round(w / 2), cy = 22, s = 12;
  for (let j = 0; j <= s; j++) {                 // top face: a diamond
    const half = Math.round(j <= s / 2 ? j * 2 : (s - j) * 2);
    ctx.fillStyle = C(ramp + '.3'); ctx.fillRect(cx - half, cy - s + j, half * 2, 1);
  }
  for (let j = 0; j < s + 2; j++) {              // left and right faces
    const y = cy - s / 2 + j;
    for (let i = 0; i < s; i++) {
      const dy = Math.round(i / 2);
      ctx.fillStyle = C(ramp + '.2'); ctx.fillRect(cx - s + i, y + dy, 1, 1);
      ctx.fillStyle = C(ramp + '.1'); ctx.fillRect(cx + s - 1 - i, y + dy, 1, 1);
    }
  }
}

const FRAME_ART = {
  hand: { prompt: 'a waving hand', flaw: 'Extra finger', paint: (ctx, w, h, fixed) => paintHand(ctx, w, h, fixed ? 5 : 6) },
  sign: { prompt: 'a sign: Hello world', flaw: 'Misspelled', paint: (ctx, w, h) => paintSign(ctx, w, h), text: ['Helo wrold', 'Hello world'] },
  cube: { prompt: 'a red cube', flaw: 'Wrong colour', paint: (ctx, w, h, fixed) => paintCube(ctx, w, h, fixed ? 'red' : 'indigo') },
};

class GalleryFrame {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE; this.y = ty * TILE; this.w = spec.w * TILE; this.h = spec.h * TILE;
    this.fact = spec.fact; this.delay = spec.delay || 0;
    this.art = FRAME_ART[spec.kind];
    this.iw = this.w - 8; this.ih = this.h - 8;
    const mk = (fixed) => { const [c, ctx] = makeCanvas(this.iw, this.ih); this.art.paint(ctx, this.iw, this.ih, fixed); return c; };
    this.broken = mk(false); this.fixed = mk(true);
    this.bcols = bake(this.broken); this.fcols = bake(this.fixed);
    const r = rng(tx * 7 + 3);
    this.thr = new Float32Array(this.iw * this.ih);
    for (let i = 0; i < this.thr.length; i++) this.thr[i] = 0.02 + r() * 0.96;
    this.state = level.game.progress.hasFact(this.fact) ? 'fixed' : 'broken';
    this.t = 0; this.p = this.state === 'fixed' ? 1 : 0;
  }

  onFact(id, level) {
    if (id !== this.fact || this.state !== 'broken') return;
    this.state = 'wait'; this.t = -this.delay;
    const b = [...level.blocks.values()].find((k) => k.fact === this.fact);
    this.from = b ? { x: b.x + 8, y: b.y } : { x: this.x, y: this.y + 60 };
  }

  update(level) {
    if (this.state === 'wait' || this.state === 'note' || this.state === 'regen') this.t++;
    if (this.state === 'wait' && this.t >= 0) { this.state = 'note'; this.t = 0; }
    if (this.state === 'note' && this.t >= 28) { this.state = 'regen'; this.t = 0; level.sfx('build'); }
    if (this.state === 'regen') {
      this.p = Math.min(1, this.t / 50);
      if (this.p >= 1) {
        this.state = 'fixed';
        level.sfx('checkpoint');
        level.floaters.push(new Floater(this.x + this.w / 2, this.y - 4, 'Fixed ✓', '#90eaa8', 60));
      }
    }
  }

  back(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y, w = this.w, h = this.h;
    if (x > ctx.W + 8 || x + w < -8) return;
    // a spotlight from the ceiling track
    ctx.fillStyle = 'rgba(255, 236, 190, 0.07)';
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, 25 - cam.y); ctx.lineTo(x + w / 2 + 6, 25 - cam.y);
    ctx.lineTo(x + w + 10, y + h + 34); ctx.lineTo(x - 10, y + h + 34); ctx.fill();
    ctx.fillStyle = C('gold.3'); ctx.fillRect(x + w / 2 - 3, 25 - cam.y, 6, 3);
    // the frame
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = C('gold.1'); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C('gold.2'); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = C('gold.3'); ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = C('white.0'); ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    const ix = x + 4, iy = y + 4;
    this.drawImage(ctx, ix, iy, t, cam);
    // caption: the prompt it was given, and the diagnosis
    const fixed = this.state === 'fixed';
    drawText(ctx, '“' + this.art.prompt + '”', x + w / 2, y + h + 3, '#e3e6ee', { align: 'center', shadow: INK, size: 6.5, weight: 600 });
    const tag = fixed ? 'Fixed ✓' : this.art.flaw;
    const tw = Math.ceil(textWidth(tag, 6.5, 700)) + 10, th = lineHeight(6.5) + 2;
    const ty = y + h + 4 + lineHeight(6.5);
    pill(ctx, Math.round(x + w / 2 - tw / 2), ty, tw, th, fixed ? '#1d6b43' : '#8f1d24', INK, 3);
    drawText(ctx, tag, x + w / 2, ty + 1, '#fbf8f1', { align: 'center', size: 6.5, weight: 700 });
  }

  drawImage(ctx, ix, iy, t, cam) {
    const st = this.state;
    if (st === 'regen') {
      // first half: the broken image dissolves into noise; second: the fix resolves
      const p = this.p, ff = t >> 1, w = this.iw, n = w * this.ih;
      for (let k = 0; k < n; k++) {
        const th = this.thr[k];
        let c;
        if (p < 0.5) c = th < p * 2 ? noiseCol(k, ff) : this.bcols[k];
        else c = th < (p - 0.5) * 2 ? this.fcols[k] : noiseCol(k, ff);
        if (!c) continue;
        ctx.fillStyle = c; ctx.fillRect(ix + (k % w), iy + Math.floor(k / w), 1, 1);
      }
    } else {
      ctx.drawImage(st === 'fixed' ? this.fixed : this.broken, ix, iy);
    }
    if (this.art.text) {
      const show = st === 'fixed' || (st === 'regen' && this.p > 0.8) ? 1 : st === 'regen' && this.p > 0.2 ? -1 : 0;
      if (show >= 0) drawText(ctx, this.art.text[show], ix + this.iw / 2, iy + 9, '#3d2414', { align: 'center', size: 7.5, weight: 700 });
    }
    // the feedback note on its way in
    if (st === 'note' && this.from) {
      const k = ease.inOutCubic(Math.min(1, this.t / 28));
      const nx = lerp(this.from.x, this.x + this.w / 2, k) - cam.x, ny = lerp(this.from.y, this.y + this.h / 2, k) - cam.y - Math.sin(k * Math.PI) * 24;
      ctx.fillStyle = INK; ctx.fillRect(nx - 5, ny - 5, 10, 10);
      ctx.fillStyle = C('gold.3'); ctx.fillRect(nx - 4, ny - 4, 8, 8);
      ctx.fillStyle = C('gold.1'); ctx.fillRect(nx - 3, ny - 2, 6, 1); ctx.fillRect(nx - 3, ny, 6, 1); ctx.fillRect(nx - 3, ny + 2, 4, 1);
    }
  }
}

// wall text: a title, a subtitle that changes once the fact is found,
// and an optional hint over the block
class WallText {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE; this.y = ty * TILE;
    Object.assign(this, { text: spec.text, sub: spec.sub, subDone: spec.subDone, fact: spec.fact, hint: spec.hint });
    this.doneT = level.game.progress.hasFact(this.fact) ? 999 : 0;
  }
  update(level) { if (level.game.progress.hasFact(this.fact)) this.doneT++; }
  back(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    drawText(ctx, this.text, x, y, '#ffd166', { shadow: INK, size: 10, weight: 700 });
    const done = this.doneT > 120;
    drawText(ctx, done ? this.subDone : this.sub, x, y + lineHeight(10) + 1, done ? '#90eaa8' : '#ff8f7f', { shadow: INK, size: 6.5, weight: 600 });
    if (this.hint && !this.doneT) {
      const [hx, hy, ht] = this.hint;
      const bob = Math.round(Math.sin(t / 12));
      drawText(ctx, ht, hx * TILE + 8 - cam.x, hy * TILE - cam.y + bob, '#ffd166', { align: 'center', shadow: INK, size: 7, weight: 700 });
    }
  }
}

registerSetpiece('hsGate', Gate);
registerSetpiece('hsAudit', Audit);
registerSetpiece('hsDenoise', Denoise);
registerSetpiece('hsFrame', GalleryFrame);
registerSetpiece('hsWallText', WallText);

// ─── music: a bright, busy loop for the line ─────────────────────────

registerSong('labelFactory', {
  bpm: 126,
  lead: steps('D5 . F#5 A5 . F#5 E5 . | D5 . A4 . B4 . D5 . | G5 . F#5 E5 . D5 E5 . | F#5 . E5 . C#5 . A4 . | D5 . F#5 A5 . B5 A5 . | G5 . E5 . F#5 . D5 . | B4 . D5 . G5 . F#5 E5 | E5 . C#5 . D5 . . .'),
  bass: steps('D3 . A2 . D3 . A2 . | B2 . F#2 . B2 . F#2 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . C#3 . | D3 . A2 . D3 . A2 . | E3 . B2 . E3 . B2 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . A2 .'),
  drums: steps('k . h . s . h h | k . h k s . h . | k . h . s . h h | k . h k s . s s'),
});

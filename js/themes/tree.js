// Tech Tree: art and mechanics. One big tree, a tier per skill category,
// each tier drawn as what its skills are about:
//   roots   languages: roots in the soil, code syntax pressed into the rock
//   data    the trunk: data streams up the sap, a scatter plot and a
//           histogram carved in the bark
//   neural  machine learning: the bricks are the input layer of a neural
//           network drawn in the canopy; lit inputs fire signals upward
//   web     web and backend: bricks hang from a wire strung between a
//           browser window and a server, with requests and responses
//   crown   tools and infrastructure: the crown is a git graph that pokes
//           into the clouds
// Skill bricks come from [data-skill] in index.html (game.content.skills).

import { TILE, H, FLAGS } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSetpiece } from '../game/setpieces.js';
import { registerSong, steps } from '../engine/audio.js';
import { Sign, Floater } from '../game/objects.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { disc, line, pill, stripedSky, noise1 } from '../art/draw.js';
import { makeCanvas, rng, hash2, clamp, lerp, ease } from '../engine/util.js';

const INK = col('ink.0');
const geo = { ground: 60 };            // the surface row; the tree mark sets it

const SOIL = { base: col('#3d2718'), mid: col('#4d3220'), hi: col('#6c4b31'), lo: col('#26170e'), stone: col('#5f4d40'), stoneHi: col('#857161') };
const BARK = { hi: col('wood.3'), mid: col('wood.2'), lo: col('wood.1'), dk: col('wood.0') };
const ROOT = { hi: col('#c08a52'), mid: col('#94643a'), lo: col('#5e3d22') };
const GRASS = { hi: col('grass.3'), mid: col('grass.2'), lo: col('grass.1'), dk: col('grass.0') };
const LEAF = { edge: col('#173322'), lo: col('#28553a'), mid: col('#3a7748'), hi: col('#62a55a') };
const RAMP = { roots: 'orange', data: 'cyan', neural: 'magenta', web: 'green', crown: 'gold' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ─── terrain: soil with a grass lip; branches above ground, roots below ──

// open sky above (and not below the surface): grass; otherwise cave floor
function covered(map, tx, ty) {
  if (ty > geo.ground) return true;
  for (let y = ty - 1; y >= 0; y--) if (map.chars[y][tx] === '#') return true;
  return false;
}

registerKit('tree', {
  terrain(ctx, x, y, m, tx, ty, map) {
    ctx.fillStyle = SOIL.base; ctx.fillRect(x, y, 16, 16);
    for (let i = 0; i < 3; i++) {
      if (hash2(tx * 5 + i, ty * 11 + i) < 0.4) {
        const sx = x + Math.floor(hash2(tx + i * 17, ty) * 13), sy = y + Math.floor(hash2(tx, ty + i * 13) * 13);
        ctx.fillStyle = SOIL.stone; ctx.fillRect(sx, sy, 2, 2);
        px(ctx, sx, sy, SOIL.stoneHi);
      }
    }
    if (hash2(tx, ty) < 0.35) hline(ctx, x + 3, y + 9, 7, SOIL.mid);
    if (!(m & 1)) {
      if (!covered(map, tx, ty)) {
        ctx.fillStyle = GRASS.lo; ctx.fillRect(x, y, 16, 7);
        ctx.fillStyle = GRASS.mid; ctx.fillRect(x, y, 16, 4);
        hline(ctx, x, y, 16, GRASS.hi);
        for (let i = 0; i < 16; i += 3) {
          const k = hash2(tx * 16 + i, ty);
          if (k < 0.6) { px(ctx, x + i, y - 1, GRASS.mid); if (k < 0.25) px(ctx, x + i, y - 2, GRASS.hi); }
        }
        hline(ctx, x, y + 7, 16, SOIL.lo);
        for (let i = 1; i < 16; i += 4) if (hash2(tx + i, ty * 3) < 0.5) px(ctx, x + i, y + 7, GRASS.lo);
      } else {
        hline(ctx, x, y, 16, SOIL.hi);                    // packed cave floor
        ctx.fillStyle = SOIL.mid; ctx.fillRect(x, y + 1, 16, 3);
        hline(ctx, x, y + 4, 16, SOIL.lo);
      }
    }
    if (!(m & 4)) {                                       // cave ceiling, with root hairs
      hline(ctx, x, y + 15, 16, SOIL.lo);
      for (let i = 1; i < 16; i += 3) {
        const k = hash2(tx * 7 + i, ty * 5);
        if (k < 0.45) vline(ctx, x + i, y + 16, 1 + Math.floor(k * 8), ROOT.lo);
      }
    }
    if (!(m & 8)) vline(ctx, x, y, 16, SOIL.hi);
    if (!(m & 2)) vline(ctx, x + 15, y, 16, SOIL.lo);
  },

  // one-way: a round branch (or a root below ground), lit from the top
  oneway(ctx, x, y, joinL, joinR, tx, ty) {
    const C = ty > geo.ground ? ROOT : BARK;
    ctx.fillStyle = INK; ctx.fillRect(x, y, 16, 7);
    ctx.fillStyle = C.mid; ctx.fillRect(x, y, 16, 5);
    hline(ctx, x, y, 16, C.hi);
    hline(ctx, x, y + 5, 16, C.lo);
    for (let i = 1; i < 16; i += 5) if (hash2(tx * 16 + i, ty) < 0.6) hline(ctx, x + i, y + 2 + (i & 1), 3, C.lo);
    if (!joinL) { ctx.clearRect(x, y + 5, 1, 2); ctx.clearRect(x, y, 1, 1); vline(ctx, x, y + 1, 4, INK); }
    if (!joinR) { ctx.clearRect(x + 15, y + 5, 1, 2); ctx.clearRect(x + 15, y, 1, 1); vline(ctx, x + 15, y + 1, 4, INK); }
    if (ty <= geo.ground) {
      // a leafy tuft under each free end
      for (const [free, ex] of [[!joinL, x + 2], [!joinR, x + 13]]) {
        if (!free) continue;
        disc(ctx, ex, y + 9, 4, LEAF.edge);
        disc(ctx, ex, y + 9, 3, LEAF.mid);
        px(ctx, ex - 1, y + 7, LEAF.hi); px(ctx, ex, y + 7, LEAF.hi);
      }
    } else {
      // root hairs
      for (let i = 2; i < 16; i += 4) if (hash2(tx + i, ty * 7) < 0.5) vline(ctx, x + i, y + 7, 2 + ((tx + i) % 3), C.lo);
    }
  },
  animated() {},
});

// ─── backdrop: a clear day; hills sink away as you climb ─────────────

registerBackground('tree', (W) => {
  const SKY_H = 600;
  const [sky, sctx] = makeCanvas(W, SKY_H);
  stripedSky(sctx, W, SKY_H, ['#1d4a8a', '#2b62a3', '#4580bf', '#6aa2d5', '#9cc6e4', '#cfe5e8', '#eef0dc']);

  const hills = strip(640, (ctx, w) => {
    const layers = [
      { base: 118, amp: 18, freq: 0.011, c: '#7fa9b8', seed: 4 },
      { base: 128, amp: 14, freq: 0.019, c: '#5f8f8a', seed: 9 },
    ];
    for (const L of layers) {
      const n = noise1(L.seed);
      ctx.fillStyle = col(L.c);
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const v = n(t * w * L.freq) * (1 - t) + n((t - 1) * w * L.freq + 256) * t;
        const y = Math.round(L.base - v * L.amp);
        ctx.fillRect(x, y, 1, H - y);
      }
    }
  });

  const grove = strip(512, (ctx, w) => {
    const r = rng(21);
    ctx.fillStyle = col('#3f7158'); ctx.fillRect(0, 136, w, H - 136);
    for (let x = 0; x < w + 20; x += 9 + Math.floor(r() * 12)) {
      const rr = 7 + Math.floor(r() * 8);
      const cy = 136 - Math.floor(r() * 6);
      disc(ctx, x % w, cy, rr, '#3f7158');
      disc(ctx, (x % w) - 2, cy - 2, rr - 3, '#4f8466');
    }
  });

  // three cloud shapes, drawn soft and flat
  const clouds = [[46, 14], [70, 18], [36, 12]].map(([w, h], i) => {
    const [c, ctx] = makeCanvas(w + 8, h + 8);
    const r = rng(100 + i);
    for (let k = 0; k < 6; k++) {
      const cx = 6 + r() * (w - 4), cy = 4 + h * 0.55 + (r() - 0.5) * h * 0.3, rr = 4 + r() * (h * 0.45);
      disc(ctx, cx, cy + 1, rr, '#c9dbea');
      disc(ctx, cx, cy, rr, '#f4f8fb');
    }
    return c;
  });
  const drift = [[0, 60, 10], [2, 130, 170], [1, 200, 300], [0, 250, 90], [2, 95, 390], [1, 175, 240]];

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      const surf = geo.ground * TILE - Math.round(H * 0.6);        // camera y while standing on the surface
      const alt = k ? surf - camY : 0;                               // > 0 as you climb
      const sy = clamp(H - SKY_H + alt * ((SKY_H - H) / Math.max(1, surf)), H - SKY_H, 0);
      ctx.drawImage(sky, 0, Math.round(sy));
      blitStrip(ctx, hills, camX, 0.08 * k, Math.max(-60, alt * 0.35));
      blitStrip(ctx, grove, camX, 0.2 * k, Math.max(-60, alt * 0.6));
      // clouds gather around the crown
      drift.forEach(([i, cy, xs], j) => {
        const cl = clouds[i];
        const y = Math.round(cy - 600 + alt * 0.65);
        if (y < -40 || y > H) return;
        const span = ctx.W + 120;
        const x = Math.round(((((xs + t * 0.05 * (1 + (j % 3)) * k - camX * 0.1 * k) % span) + span) % span) - 60);
        ctx.drawImage(cl, x, y);
      });
    },
  };
});

// ─── the tree: cave wall, roots, trunk, limbs and foliage ────────────
// Painted once into a world-sized canvas and blitted behind the tiles.

function blob(g, x, y, r, P) {
  disc(g, x, y, r + 1, P.edge);
  disc(g, x, y, r, P.lo);
  disc(g, x - r * 0.25, y - r * 0.3, Math.max(1, r * 0.72), P.mid);
  disc(g, x - r * 0.45, y - r * 0.5, Math.max(1, r * 0.32), P.hi);
}

// a tapered limb along a quadratic curve, outline first
function limb(g, pts, r0, r1, C) {
  const [a, b, c] = pts;
  const at = (s) => [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * b[0] + s * s * c[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * b[1] + s * s * c[1]];
  const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2) + 2;
  for (const pass of [0, 1, 2]) {
    for (let i = 0; i <= n; i++) {
      const s = i / n, [x, y] = at(s), r = lerp(r0, r1, s);
      if (pass === 0) disc(g, x, y, r + 1, INK);
      else if (pass === 1) disc(g, x, y, r, C.mid);
      else if (r > 2) disc(g, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.35), C.hi);
    }
  }
}

function paintTree(map, ground, cx) {
  const [c, g] = makeCanvas(map.w, map.h);
  const r = rng(1234);
  const groundY = ground * TILE;

  // the cave behind the roots tier
  let ceil = ground;
  while (ceil < map.rows && map.chars[ceil][Math.floor(cx / TILE)] === '#') ceil++;
  const caveTop = ceil * TILE;
  g.save(); g.translate(0, groundY);
  stripedSky(g, map.w, map.h - groundY, ['#2c1c13', '#24170f', '#1c120b']);
  g.restore();
  const strata = noise1(31);
  for (let k = 0; k < 6; k++) {
    const by = caveTop + 18 + k * 30;
    g.fillStyle = col(k % 2 ? '#322016' : '#2f1e15');
    for (let x = 0; x < map.w; x++) g.fillRect(x, Math.round(by + strata(x * 0.03 + k * 9) * 8), 1, 2);
  }
  for (let i = 0; i < 40; i++) {
    const sx = r() * map.w, sy = caveTop + r() * (map.h - caveTop);
    g.fillStyle = col('#3a281d'); g.fillRect(Math.round(sx), Math.round(sy), 3, 2);
  }

  // big roots spreading down from the trunk into the cave
  const floorY = map.h - 3 * TILE;
  const roots = [
    [[cx - 34, caveTop - 8], [cx - 40, caveTop + 110], [cx - 200, floorY - 6], 11, 2],
    [[cx - 12, caveTop - 8], [cx - 6, caveTop + 120], [cx - 80, floorY], 9, 2],
    [[cx + 14, caveTop - 8], [cx + 20, caveTop + 110], [cx + 96, floorY - 2], 9, 2],
    [[cx + 36, caveTop - 8], [cx + 60, caveTop + 70], [cx + 220, caveTop + 110], 10, 2],
    [[cx - 50, caveTop - 8], [cx - 120, caveTop + 20], [cx - 230, caveTop + 40], 7, 2],
  ];
  for (const [a, b, e, r0, r1] of roots) {
    limb(g, [a, b, e], r0, r1, ROOT);
    const m = [(a[0] + 2 * b[0] + e[0]) / 4, (a[1] + 2 * b[1] + e[1]) / 4];
    const side = e[0] < cx ? -1 : 1;
    limb(g, [m, [m[0] + side * 30, m[1] + 6], [m[0] + side * 52, m[1] + 34]], 3, 1, ROOT);
  }

  // the trunk: half-width per world y, flaring at the base
  const forkY = 20 * TILE, topY = 9 * TILE;
  const half = (y) => {
    const k = clamp((groundY - y) / (groundY - forkY), 0, 1);
    let h = lerp(46, 28, k);
    const flare = clamp(1 - (groundY - y) / 26, 0, 1);
    return h + flare * flare * 24;
  };
  const grooves = [-0.7, -0.45, -0.15, 0.1, 0.35, 0.6].map((f, i) => ({ f, n: noise1(50 + i) }));
  for (let y = forkY; y < groundY + 4; y++) {
    const h = Math.round(half(y));
    const x0 = Math.round(cx - h), x1 = Math.round(cx + h);
    g.fillStyle = INK; g.fillRect(x0 - 1, y, x1 - x0 + 2, 1);
    g.fillStyle = BARK.mid; g.fillRect(x0, y, x1 - x0, 1);
    g.fillStyle = BARK.hi; g.fillRect(x0, y, 3, 1);
    g.fillStyle = BARK.lo; g.fillRect(x1 - 8, y, 6, 1);
    g.fillStyle = BARK.dk; g.fillRect(x1 - 2, y, 2, 1);
    for (const gr of grooves) {
      const gx = Math.round(cx + gr.f * h + (gr.n(y * 0.05) - 0.5) * 4);
      g.fillStyle = gr.n(y * 0.11 + 7) < 0.25 ? BARK.dk : BARK.lo;
      g.fillRect(gx, y, 1, 1);
    }
  }
  // the crown: a leader up to the tree top and two big limbs
  limb(g, [[cx, forkY + 8], [cx + 6, forkY - 60], [cx + 24, topY + 6]], 22, 7, BARK);
  limb(g, [[cx - 14, forkY + 10], [cx - 60, forkY - 30], [cx - 150, 12 * TILE]], 12, 4, BARK);
  limb(g, [[cx + 14, forkY + 10], [cx + 70, forkY - 20], [cx + 160, 13 * TILE]], 12, 4, BARK);

  // limbs out to every branch that doesn't cross the trunk
  for (let ty = 0; ty < ground; ty++) {
    const row = map.chars[ty];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '=' || row[x - 1] === '=') continue;
      let e = x;
      while (row[e + 1] === '=') e++;
      const y = ty * TILE + 3;
      const h = y > forkY ? half(y) : 10;
      const a = x * TILE, b = (e + 1) * TILE;
      if (b < cx - h) limb(g, [[cx - h + 6, y + 4], [(b + cx - h) / 2, y + 6], [b - 6, y + 3]], 4, 3, BARK);
      else if (a > cx + h) limb(g, [[cx + h - 6, y + 4], [(a + cx + h) / 2, y + 6], [a + 6, y + 3]], 4, 3, BARK);
    }
  }

  // foliage: hanging under each long bough, and a crown over the top
  for (let ty = 0; ty < ground; ty++) {
    const row = map.chars[ty];
    let runs = 0;
    for (let x = 0; x < row.length; x++) if (row[x] === '=') runs++;
    if (runs < 12) continue;
    const y = ty * TILE + 12;
    for (let x = -8; x < map.w + 16; x += 20 + Math.floor(r() * 10)) blob(g, x, y + r() * 6, 12 + Math.floor(r() * 7), LEAF);
    for (const sx of [-10, map.w + 10]) for (let k = 0; k < 3; k++) blob(g, sx + (r() - 0.5) * 20, y - 30 - k * 34, 16 + Math.floor(r() * 8), LEAF);
  }
  const top = topY - 8;
  for (const [R, n, s0, s1] of [[205, 15, 18, 28], [158, 12, 13, 20]]) {
    for (let k = 0; k < n; k++) {
      const a = (k / (n - 1)) * Math.PI;
      blob(g, cx + 24 + Math.cos(a) * R * 1.08 + (r() - 0.5) * 16, top - Math.sin(a) * R * 0.5 + (r() - 0.5) * 12, s0 + Math.floor(r() * (s1 - s0)), LEAF);
    }
  }
  return c;
}

class TreeArt {
  constructor(tx, ty, spec, level) {
    this.level = level;
    geo.ground = ty + 1;
    this.canvas = paintTree(level.map, ty + 1, spec.cx * TILE);
    this.cheered = false;
  }
  update(level) {
    // at the tree top, a nudge toward any skills still on the tree
    if (!this.cheered && level.hero.state === 'victory') {
      this.cheered = true;
      const all = level.game.content.skills, have = all.filter((s) => level.game.progress.hasSkill(s.name)).length;
      level.game.toast(have === all.length ? `All <b>${all.length}</b> skills collected` : `Skills <b>${have}/${all.length}</b>: the rest are still on the tree`, 4000);
    }
  }
  back(ctx, cam) { ctx.drawImage(this.canvas, -cam.x, -cam.y); }
}

// ─── skill bricks ────────────────────────────────────────────────────

const GLYPHS = {
  code: ['..x..x.x..', '..x..x.x..', '.x...x..x.', 'x...x....x', '.x..x...x.', '..x.x..x..', '..x.x..x..'],
  gear: ['....xx....', '.x.xxxx.x.', '..xxxxxx..', '.xxx..xxx.', 'xxx....xxx', 'xxx....xxx', '.xxx..xxx.', '..xxxxxx..', '.x.xxxx.x.', '....xx....'],
  grid: ['xx.xx.xx', 'xx.xx.xx', '........', 'xx.xx.xx', 'xx.xx.xx', '........', 'xx.xx.xx', 'xx.xx.xx'],
  window: ['xxxxxxxxxx', 'x.x.xxxxxx', 'xxxxxxxxxx', 'x........x', 'x.xxxx...x', 'x........x', 'x.xxxxxx.x', 'xxxxxxxxxx'],
};
const GLYPH_OF = { roots: 'code', data: 'grid', neural: 'neuron', web: 'window', crown: 'gear' };

function glyph(g, name, color) {
  g.fillStyle = color;
  const map = GLYPHS[name];
  if (map) {
    const ox = Math.floor((16 - map[0].length) / 2), oy = Math.floor((16 - map.length) / 2);
    map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') g.fillRect(ox + i, oy + j, 1, 1); }));
  } else if (name === 'neuron') {
    // three inputs feeding one node: a tiny network diagram
    for (const [sy, ey] of [[3, 7], [7, 8], [11, 9]]) { g.fillRect(3, sy, 2, 2); line(g, 5, sy + (sy < 7 ? 1 : sy > 7 ? 0 : 1), 8, ey, color); }
    g.fillRect(9, 6, 4, 4);
  }
}

const brickCache = new Map();
function brickArt(look, lit) {
  const key = look + (lit ? '+' : '-');
  if (brickCache.has(key)) return brickCache.get(key);
  const R = RAMP[look];
  const [c, g] = makeCanvas(16, 16);
  g.fillStyle = INK; g.fillRect(0, 0, 16, 16);
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]]) g.clearRect(x, y, 1, 1);
  g.fillStyle = col(R + '.2'); g.fillRect(1, 1, 14, 14);
  hline(g, 1, 1, 14, col(R + '.3')); vline(g, 1, 1, 13, col(R + '.3'));
  hline(g, 1, 14, 14, col(R + '.0')); vline(g, 14, 2, 13, col(R + '.0'));
  g.fillStyle = lit ? col(R + '.1') : '#0f1430';
  g.fillRect(3, 3, 10, 10);
  if (lit) { hline(g, 3, 3, 10, col(R + '.2')); }
  glyph(g, GLYPH_OF[look], lit ? col('white.2') : col(R + '.3'));
  if (!lit) for (let i = 3; i < 13; i += 2) px(g, i, 12, col(R + '.1'));
  brickCache.set(key, c);
  return c;
}

class SkillBrick {
  constructor(tx, ty, skill, tier) {
    this.tx = tx; this.ty = ty;
    this.x = tx * TILE; this.y = ty * TILE; this.w = TILE; this.h = TILE;
    this.skill = skill; this.tier = tier;
    this.used = false;
    this.bump = 0;
  }
  init(level) { this.used = level.game.progress.hasSkill(this.skill.name); }
  hit(level) {
    this.bump = 8;
    level.bumpAbove(this);
    this.tier.hitBrick(this, level);
  }
  update() { if (this.bump > 0) this.bump--; }
  draw(ctx, cam, t) {
    const off = this.bump > 0 ? -Math.round(Math.sin(((8 - this.bump) / 8) * Math.PI) * 5) : 0;
    const x = this.x - cam.x, y = this.y - cam.y + off;
    if (y < -TILE || y > H) return;
    ctx.drawImage(brickArt(this.tier.look, this.used), x, y);
    if (!this.used && (((t + this.tx * 11) >> 2) & 31) < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      const k = ((t + this.tx * 11) >> 2) & 31;
      ctx.fillRect(x + 3 + k * 4, y + 2, 2, 1);
    }
  }
}

// the chip that pops out of a brick and flies to the HUD counter
class SkillChip {
  constructor(level, x, y, name, look, fly) {
    this.level = level; this.x = x; this.y = y; this.name = name; this.fly = fly;
    this.R = RAMP[look];
    this.t = 0; this.alive = true;
    this.from = null; this.to = null;
    this.still = level.game.reduced;      // reduced motion: pop and fade, no flight
  }
  update() {
    this.t++;
    const lv = this.level;
    if (this.fly && !this.still && this.t === 46) {
      this.from = { x: this.x - lv.camera.x, y: this.y - 26 - lv.camera.y };
      const el = document.getElementById('hud-skills');
      const r = el && el.getBoundingClientRect();
      this.to = r && r.width ? lv.game.display.toGame(r.left + r.width / 2, r.top + r.height / 2) : { x: lv.W / 2, y: 6 };
    }
    if (this.t >= (this.fly ? 70 : 60)) {
      this.alive = false;
      if (this.fly) {
        lv.game.ui.hud.refresh(true);
        lv.sfx('tick');
      }
    }
  }
  draw(ctx, cam) {
    const t = this.t;
    let x, y;
    if (this.from) {
      const k = ease.inOutCubic(clamp((t - 46) / 24, 0, 1));
      x = lerp(this.from.x, this.to.x, k); y = lerp(this.from.y, this.to.y, k);
      if (k > 0.55) {                       // shrinks to a spark near the counter
        ctx.fillStyle = INK; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
        ctx.fillStyle = col(this.R + '.3'); ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        return;
      }
    } else {
      if ((!this.fly || this.still) && t > 50 && (t & 2)) return;
      const k = ease.outBack(clamp(t / 16, 0, 1));
      x = this.x - cam.x; y = this.y - cam.y - 26 * k;
    }
    const size = 7.5;
    const w = Math.ceil(textWidth(this.name, size, 700)) + 12, h = lineHeight(size) + 5;
    const bx = Math.round(clamp(x - w / 2, 2, ctx.W - w - 2)), by = Math.round(y - h / 2);
    pill(ctx, bx, by, w, h, col(this.R + '.1'), col(this.R + '.3'), 4);
    drawText(ctx, this.name, bx + w / 2, by + 2.5, '#fbf8f1', { align: 'center', size, weight: 700 });
  }
}

// ─── tier signs: a wooden post with the category and its count ──────

class TierSign extends Sign {
  constructor(tx, ty, fact, tier) { super(tx, ty, fact, true); this.tier = tier; }
  draw(ctx, cam, t, A, level) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (y < -80 || y > H + 20) return;
    const tier = this.tier, R = tier.ramp;
    // post
    ctx.fillStyle = INK; ctx.fillRect(x + 6, y - 8, 5, 24);
    ctx.fillStyle = BARK.mid; ctx.fillRect(x + 7, y - 8, 3, 24);
    ctx.fillStyle = BARK.hi; ctx.fillRect(x + 7, y - 8, 1, 24);
    // board
    const n = tier.count, total = tier.bricks.length;
    const line2 = tier.maxed ? 'Maxed ✓' : `Skills ${n}/${total}`;
    const s1 = 7.5, s2 = 6.5;
    const w = Math.ceil(Math.max(textWidth(tier.title, s1, 700), textWidth(line2, s2))) + 14;
    const lh = lineHeight(s1), h = lh + lineHeight(s2) + 6;
    const room = level.map.w - cam.x;
    const bx = Math.round(clamp(x + 8 - w / 2, 2 - cam.x, room - w - 2));
    // on small screens the text floor makes the board taller: keep it under the bricks
    const by = tier.bricks.length ? Math.max(y - 8 - h, tier.bricks[0].y + TILE + 3 - Math.round(cam.y)) : y - 8 - h;
    pill(ctx, bx, by, w, h, '#5a3a22', '#26170e', 3);
    ctx.fillStyle = BARK.hi; ctx.fillRect(bx + 3, by + 1, w - 6, 1);
    drawText(ctx, tier.title, bx + w / 2, by + 3, '#fbf8f1', { align: 'center', size: s1, weight: 700 });
    drawText(ctx, line2, bx + w / 2, by + 3 + lh, tier.maxed ? '#ffe08a' : col(R + '.3'), { align: 'center', size: s2, weight: 600 });
    const found = level.game.progress.hasFact(this.fact);
    const bob = Math.round(Math.sin(t / 10) * 1.5);
    if (!found) drawText(ctx, '!', bx + w / 2, by - 13 + bob, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 10, weight: 700 });
    else if (this.near) drawText(ctx, 'Enter to read', bx + w / 2, by - 11 + bob, '#5ce1e6', { align: 'center', shadow: '#0b0d17', size: 6.5 });
  }
}

// ─── a tier: its sign, its bricks, and the art that depicts it ──────

class Tier {
  constructor(tx, ty, spec, level) {
    this.look = spec.look;
    this.ramp = RAMP[spec.look];
    const content = level.game.content;
    const f = content.get(spec.fact);
    this.title = f ? f.title : spec.fact;
    this.floorY = (ty + 1) * TILE;
    this.sign = new TierSign(tx, ty, spec.fact, this);
    level.objects.push(this.sign);

    const skills = content.skills.filter((s) => s.category === spec.fact);
    const per = spec.perRow || 14;
    this.bricks = skills.map((s, i) => {
      const row = Math.floor(i / per);
      const inRow = Math.min(per, skills.length - row * per);
      const bx = Math.round(spec.cx - inRow / 2) + (i % per);
      const by = ty + spec.dy - row * 4;
      if (FLAGS.debug && level.map.flag(bx, by)) console.warn('[tree] brick overlaps terrain:', s.name, bx, by);
      const b = new SkillBrick(bx, by, s, this);
      level.addBlock(b);
      return b;
    });
    this.maxT = 0;
    const D = DECOR[spec.look];
    this.decor = D && this.bricks.length ? new D(this, level) : null;
  }

  get count() { let n = 0; for (const b of this.bricks) if (b.used) n++; return n; }
  get maxed() { return this.bricks.length > 0 && this.count === this.bricks.length; }

  hitBrick(b, level) {
    const g = level.game;
    const name = b.skill.name;
    const cx = b.x + 8;
    if (!g.progress.addSkill(name)) {
      b.used = true;
      level.sfx('bump');
      level.floaters.push(new SkillChip(level, cx, b.y, name, this.look, false));
      return;
    }
    b.used = true;
    level.sfx('checkpoint');
    level.freeze = 2;
    g.particles.burst(cx, b.y, 10, [col(this.ramp + '.3'), col('white.2'), col(this.ramp + '.2')], { speed: 1.5, up: 1.2, life: 22 });
    level.floaters.push(new SkillChip(level, cx, b.y, name, this.look, true));
    const n = this.count, total = this.bricks.length;
    g.toast(`<b>${esc(name)}</b> · ${esc(this.title)} ${n}/${total}`, 2200);
    g.ui.hud.announce(`Skill: ${name}. ${this.title}, ${n} of ${total}.`);
    if (n === total) this.max(level);
  }

  max(level) {
    this.maxT = 1;
    const g = level.game;
    level.after(30, () => level.sfx('oneup'));
    level.camera.shake(0.2);
    this.bricks.forEach((b, i) => level.after(i * 3, () => g.particles.burst(b.x + 8, b.y + 8, 6, [col('gold.3'), col('white.2'), col(this.ramp + '.3')], { speed: 1.8, up: 1.4, life: 30 })));
    level.floaters.push(new Floater(this.sign.x + 8, this.sign.y - 52, this.title + ' maxed', '#ffe08a', 110));
    g.toast(`<b>${esc(this.title)}</b> maxed: all ${this.bricks.length} skills`, 3200);
  }

  update(level) { if (this.maxT) this.maxT++; if (this.decor && this.decor.update) this.decor.update(level); }
  back(ctx, cam, t) { if (this.decor) this.decor.back(ctx, cam, t); }
}

// ─── tier art ────────────────────────────────────────────────────────

const onScreen = (y0, y1, cam) => y1 - cam.y > -20 && y0 - cam.y < H + 20;

// languages: each brick hangs on a rootlet; code syntax pressed into the soil
class RootsDecor {
  constructor(tier, level) {
    this.tier = tier;
    const map = level.map;
    this.lets = tier.bricks.map((b) => {
      let r = b.ty - 1;
      while (r > 0 && map.chars[r][b.tx] !== '#') r--;
      return { b, x: b.x + 8, top: (r + 1) * TILE, bottom: b.y + 1, seed: b.tx * 7 };
    });
    this.y0 = Math.min(...this.lets.map((l) => l.top));
    this.y1 = tier.floorY;
    const R = rng(77);
    const marks = ['{ }', '</>', ';', '( )', '=>', '[ ]', '#!', '//', '&&', '::'];
    const bx0 = Math.min(...tier.bricks.map((b) => b.x)) - 8, bx1 = Math.max(...tier.bricks.map((b) => b.x)) + 24;
    const brickY = tier.bricks.length ? tier.bricks[0].y : 0;
    this.fossils = [];
    for (let tries = 0; this.fossils.length < 9 && tries < 200; tries++) {
      const x = 12 + R() * (map.w - 40), y = this.y0 + 10 + R() * (this.y1 - this.y0 - 30);
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (map.flag(tx, ty) || map.flag(tx + 1, ty) || map.flag(tx, ty + 1)) continue;
      if (x > bx0 - 20 && x < bx1 && y > brickY - 30 && y < brickY + 24) continue;
      if (this.fossils.some((f) => Math.abs(f.x - x) < 50 && Math.abs(f.y - y) < 30)) continue;
      this.fossils.push({ x, y, s: marks[this.fossils.length % marks.length] });
    }
  }
  back(ctx, cam, t) {
    if (!onScreen(this.y0, this.y1, cam)) return;
    const maxed = this.tier.maxed;
    for (const f of this.fossils) drawText(ctx, f.s, f.x - cam.x, f.y - cam.y, maxed ? '#e08f4a' : '#6a4630', { size: 9, weight: 700 });
    for (const l of this.lets) {
      const lit = l.b.used;
      for (let y = l.top; y < l.bottom; y++) {
        const x = Math.round(l.x + Math.sin((y + l.seed) / 9) * 1.5 - cam.x);
        ctx.fillStyle = INK; ctx.fillRect(x - 1, y - cam.y, 4, 1);
        ctx.fillStyle = lit ? ROOT.hi : ROOT.mid; ctx.fillRect(x, y - cam.y, 2, 1);
      }
      if (lit) {                                  // light running up the rootlet
        const span = l.bottom - l.top;
        const yy = l.bottom - ((t * 0.8 + l.seed * 5) % span);
        const x = Math.round(l.x + Math.sin((yy + l.seed) / 9) * 1.5 - cam.x);
        ctx.fillStyle = col('orange.3'); ctx.fillRect(x, Math.round(yy - cam.y), 2, 3);
      }
    }
  }
}

// data: data streaming up the sap, a scatter plot and a histogram in the bark
class DataDecor {
  constructor(tier, level) {
    this.tier = tier;
    const xs = tier.bricks.map((b) => b.x);
    this.cx = (Math.min(...xs) + Math.max(...xs) + 16) / 2;
    this.y1 = tier.floorY;
    this.brickY = tier.bricks.length ? tier.bricks[0].y : this.y1 - 64;
    const rows = level.room.map;
    let r = Math.floor(this.y1 / TILE) - 2;
    while (r > 0 && !(rows[r] || '').includes('=========')) r--;
    this.y0 = (r + 1) * TILE;                 // up to the next bough
    this.art = this.carve();
  }
  carve() {
    const [c, g] = makeCanvas(84, 40);
    const cut = col('#d9a66a'), deep = BARK.dk;
    const R = rng(5);
    // scatter plot with a fitted line
    vline(g, 2, 2, 34, deep); hline(g, 2, 36, 36, deep);
    vline(g, 1, 2, 34, cut); hline(g, 2, 37, 36, cut);
    for (let i = 0; i < 14; i++) {
      const u = R();
      const x = 5 + Math.round(u * 30), y = Math.round(33 - u * 26 + (R() - 0.5) * 9);
      g.fillStyle = deep; g.fillRect(x, y + 1, 2, 2);
      g.fillStyle = cut; g.fillRect(x, y, 2, 2);
    }
    line(g, 4, 34, 37, 6, col('cyan.3'));
    // histogram
    const bars = [6, 13, 22, 30, 24, 15, 8];
    bars.forEach((h, i) => {
      g.fillStyle = deep; g.fillRect(46 + i * 5 + 1, 37 - h, 4, h);
      g.fillStyle = cut; g.fillRect(46 + i * 5, 36 - h, 4, h);
    });
    hline(g, 45, 37, 36, cut);
    return c;
  }
  back(ctx, cam, t) {
    if (!onScreen(this.y0, this.y1, cam)) return;
    const maxed = this.tier.maxed;
    const lit = this.tier.count;
    // sap: one lane per lit skill, plus a trickle
    const lanes = Math.min(6, 1 + lit);
    const span = this.y1 - this.y0;
    for (let i = 0; i < lanes; i++) {
      const lx = Math.round(this.cx - 30 + i * 12 + (i % 2) * 3 - cam.x);
      for (let k = 0; k < span; k += 18) {
        const y = this.y1 - ((t * (maxed ? 0.9 : 0.5) + k + i * 7) % span);
        ctx.fillStyle = (k / 18 + i) % 3 === 0 ? col('cyan.3') : col('cyan.2');
        ctx.fillRect(lx, Math.round(y - cam.y), 2, 2);
      }
    }
    ctx.drawImage(this.art, Math.round(this.cx - 42 - cam.x), Math.round(this.brickY - 46 - cam.y));
  }
}

// machine learning: the bricks are the input layer of a small network
class NeuralDecor {
  constructor(tier) {
    this.tier = tier;
    const bs = tier.bricks;
    const x0 = Math.min(...bs.map((b) => b.x)) + 8, x1 = Math.max(...bs.map((b) => b.x)) + 8;
    const by = bs.length ? bs[0].y : tier.floorY - 64;
    this.inputs = bs.map((b) => ({ x: b.x + 8, y: b.y - 1, b }));
    const spread = (n, a, z) => Array.from({ length: n }, (_, i) => a + ((z - a) * (i + 0.5)) / n);
    this.hidden = spread(5, x0 - 6, x1 + 6).map((x) => ({ x, y: by - 32 }));
    this.out = spread(2, x0 + 24, x1 - 24).map((x) => ({ x, y: by - 66 }));
    this.y0 = by - 80; this.y1 = by;
  }
  back(ctx, cam, t) {
    if (!onScreen(this.y0, this.y1, cam)) return;
    const tier = this.tier;
    const n = tier.count, total = Math.max(1, tier.bricks.length), maxed = tier.maxed;
    const act = n / total;
    const X = (p) => p.x - cam.x, Y = (p) => p.y - cam.y;
    ctx.lineWidth = 1;
    // edges
    for (const i of this.inputs) for (const h of this.hidden) {
      ctx.strokeStyle = i.b.used ? 'rgba(255,134,208,0.55)' : 'rgba(134,32,107,0.45)';
      ctx.beginPath(); ctx.moveTo(X(i), Y(i)); ctx.lineTo(X(h), Y(h)); ctx.stroke();
    }
    for (const h of this.hidden) for (const o of this.out) {
      ctx.strokeStyle = n ? `rgba(255,134,208,${0.25 + act * 0.5})` : 'rgba(134,32,107,0.45)';
      ctx.beginPath(); ctx.moveTo(X(h), Y(h)); ctx.lineTo(X(o), Y(o)); ctx.stroke();
    }
    // signals: from lit inputs up through the layers
    this.inputs.forEach((i, a) => {
      if (!i.b.used) return;
      const h = this.hidden[(a * 3 + (t >> 6)) % this.hidden.length];
      const o = this.out[a % this.out.length];
      const k = ((t + a * 13) % 70) / 70;
      const [p, q, s] = k < 0.5 ? [i, h, k * 2] : [h, o, (k - 0.5) * 2];
      const sx = Math.round(lerp(X(p), X(q), s)), sy = Math.round(lerp(Y(p), Y(q), s));
      ctx.fillStyle = INK; ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillStyle = col('white.2'); ctx.fillRect(sx - 1, sy - 1, 2, 2);
    });
    // neurons
    const node = (p, level, r) => {
      disc(ctx, X(p), Y(p), r + 1, 'ink.0');
      disc(ctx, X(p), Y(p), r, level > 0.99 ? 'magenta.3' : level > 0 ? 'magenta.2' : 'magenta.1');
      if (level > 0) disc(ctx, X(p) - 1, Y(p) - 1, Math.max(1, r - 3), level > 0.99 ? 'white.2' : 'magenta.3');
    };
    for (const h of this.hidden) node(h, act, 5);
    for (const o of this.out) node(o, maxed ? 1 : act * 0.8, 6);
  }
}

// web and backend: bricks hang from a wire between a browser and a server
class WebDecor {
  constructor(tier) {
    this.tier = tier;
    const bs = tier.bricks;
    const x0 = Math.min(...bs.map((b) => b.x)), x1 = Math.max(...bs.map((b) => b.x)) + 16;
    const by = bs.length ? bs[0].y : tier.floorY - 64;
    // the client and the server sit level with the bricks, so the whole
    // exchange stays in view from the tier floor
    this.client = { x: x0 - 30, y: by - 3, w: 24, h: 18 };
    this.server = { x: x1 + 6, y: by - 7, w: 18, h: 24 };
    this.wireY0 = by - 12;
    this.wa = { x: this.client.x + this.client.w - 4, y: this.wireY0 };
    this.wb = { x: this.server.x + 4, y: this.wireY0 };
    this.cords = bs.map((b) => ({ b, x: b.x + 8 }));
    this.y0 = by - 30; this.y1 = by + 24;
  }
  wireY(x) {
    const { wa, wb } = this;
    const u = (x - wa.x) / (wb.x - wa.x);
    return wa.y + 3 * (1 - (2 * u - 1) * (2 * u - 1));
  }
  back(ctx, cam, t) {
    if (!onScreen(this.y0, this.y1, cam)) return;
    const tier = this.tier, n = tier.count, maxed = tier.maxed;
    const ox = -cam.x, oy = -cam.y;
    // masts up from each box to the wire
    for (const [b, x] of [[this.client, this.wa.x], [this.server, this.wb.x]]) {
      ctx.fillStyle = INK; ctx.fillRect(x - 1 + ox, this.wireY0 - 1 + oy, 3, b.y - this.wireY0 + 1);
      ctx.fillStyle = col('steel.3'); ctx.fillRect(x + ox, this.wireY0 + oy, 1, b.y - this.wireY0);
    }
    // the wire and the cords holding each brick
    for (let x = this.wa.x; x <= this.wb.x; x++) {
      const y = Math.round(this.wireY(x) + oy);
      ctx.fillStyle = INK; ctx.fillRect(x + ox, y - 1, 1, 3);
      ctx.fillStyle = col('slate.3'); ctx.fillRect(x + ox, y, 1, 1);
    }
    for (const c of this.cords) {
      const top = Math.round(this.wireY(c.x));
      ctx.fillStyle = c.b.used ? col('green.3') : col('slate.2');
      ctx.fillRect(c.x + ox, top + oy, 1, c.b.y - top);
    }
    // packets: requests out to the server, responses back
    const lanes = maxed ? 4 : 1 + Math.floor(n / 4);
    const len = this.wb.x - this.wa.x;
    for (let i = 0; i < lanes; i++) {
      const k = ((t * 1.1 + (i * len) / lanes) % len) / len;
      for (const [kk, c] of [[k, 'cyan.3'], [1 - ((k + 0.5) % 1), 'green.3']]) {
        const x = this.wa.x + kk * len;
        const y = this.wireY(x);
        ctx.fillStyle = INK; ctx.fillRect(Math.round(x + ox) - 2, Math.round(y + oy) - 2, 5, 4);
        ctx.fillStyle = col(c); ctx.fillRect(Math.round(x + ox) - 1, Math.round(y + oy) - 1, 3, 2);
      }
    }
    // the browser window: its page fills in as skills are collected
    const c = this.client, cx = c.x + ox, cy = c.y + oy;
    ctx.fillStyle = INK; ctx.fillRect(cx - 1, cy - 1, c.w + 2, c.h + 2);
    ctx.fillStyle = '#0f1430'; ctx.fillRect(cx, cy, c.w, c.h);
    ctx.fillStyle = col('indigo.2'); ctx.fillRect(cx, cy, c.w, 5);
    [['red.2', 0], ['gold.2', 4], ['green.2', 8]].forEach(([cc, dx]) => { ctx.fillStyle = col(cc); ctx.fillRect(cx + 2 + dx, cy + 1, 2, 2); });
    const rows = Math.min(3, Math.ceil((n / Math.max(1, tier.bricks.length)) * 3));
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < rows ? col(i === 0 ? 'green.3' : 'slate.3') : col('slate.1');
      ctx.fillRect(cx + 3, cy + 8 + i * 3, c.w - 6 - (i % 2) * 7, 1);
    }
    // the server: a light per drive, busier as skills come in
    const s = this.server, sx = s.x + ox, sy = s.y + oy;
    ctx.fillStyle = INK; ctx.fillRect(sx - 1, sy - 1, s.w + 2, s.h + 2);
    ctx.fillStyle = col('steel.2'); ctx.fillRect(sx, sy, s.w, s.h);
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = col('steel.1'); ctx.fillRect(sx + 2, sy + 3 + r * 7, s.w - 4, 5);
      const on = maxed || ((t >> 3) + r * 5) % 7 < 2 + Math.min(4, n);
      ctx.fillStyle = on ? col('green.3') : col('slate.1'); ctx.fillRect(sx + s.w - 6, sy + 5 + r * 7, 2, 1);
      ctx.fillStyle = col('steel.3'); ctx.fillRect(sx + 4, sy + 5 + r * 7, 5, 1);
    }
  }
}

// tools and infrastructure: the crown's top branches are a git graph
class CrownDecor {
  constructor(tier, level) {
    this.tier = tier;
    const bs = tier.bricks;
    const by = bs.length ? bs[0].y : tier.floorY - 64;
    // the main line runs from the bough to the tree top's goal
    const rows = level.room.map;
    const goal = rows.findIndex((r) => r.includes('G'));
    const gx = goal >= 0 ? rows[goal].indexOf('G') * TILE + 8 : 15 * TILE;
    this.main = { x: gx, y0: tier.floorY - 4, y1: (goal + 1) * TILE + 8 };
    const ylo = this.main.y0, yhi = this.main.y1;
    this.branches = [
      { x: gx - 64, from: ylo - 20, to: by - 34, c: 'cyan.3' },
      { x: gx + 56, from: by - 10, to: yhi + 16, c: 'magenta.3' },
    ];
    this.y0 = yhi - 20; this.y1 = ylo + 10;
  }
  back(ctx, cam, t) {
    if (!onScreen(this.y0, this.y1, cam)) return;
    const ox = -cam.x, oy = -cam.y;
    const maxed = this.tier.maxed;
    const m = this.main;
    const thick = (x0, y0, x1, y1, c) => {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) line(ctx, x0 + ox + dx, y0 + oy + dy, x1 + ox + dx, y1 + oy + dy, 'ink.0');
      line(ctx, x0 + ox, y0 + oy, x1 + ox, y1 + oy, c);
      line(ctx, x0 + ox + 1, y0 + oy, x1 + ox + 1, y1 + oy, c);
    };
    for (const b of this.branches) {
      thick(m.x, b.from, b.x, b.from - 18, b.c);
      thick(b.x, b.from - 18, b.x, b.to + 18, b.c);
      thick(b.x, b.to + 18, m.x, b.to, b.c);
    }
    thick(m.x, m.y0, m.x, m.y1, 'gold.3');
    const commit = (x, y, c, k) => {
      disc(ctx, x + ox, y + oy, 4, 'ink.0');
      disc(ctx, x + ox, y + oy, 3, maxed && ((t >> 4) + k) % 4 === 0 ? 'white.2' : c);
    };
    let k = 0;
    for (let y = m.y0 - 10; y > m.y1 + 10; y -= 26) commit(m.x, y, 'gold.2', k++);
    for (const b of this.branches) for (let y = b.from - 30; y > b.to + 26; y -= 26) commit(b.x, y, b.c.replace('.3', '.2'), k++);
  }
}

const DECOR = { roots: RootsDecor, data: DataDecor, neural: NeuralDecor, web: WebDecor, crown: CrownDecor };

registerSetpiece('tree.art', TreeArt);
registerSetpiece('tree.tier', Tier);

// ─── music: a bright climb in G ──────────────────────────────────────

registerSong('tree', {
  bpm: 116,
  lead: steps('G4 B4 D5 G5 . D5 B4 . | A4 C5 E5 A5 . E5 C5 . | B4 D5 G5 B5 . G5 D5 . | C5 E5 A5 . G5 . F#5 .'),
  bass: steps('G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . B2 . | C3 . G3 . D3 . F#3 .'),
  drums: steps('k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h k s . s h'),
});

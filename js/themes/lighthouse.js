// Lighthouse: art and mechanics for the contact finale. A night harbor;
// three signal boxes on the dock hold the contact links, and each one you
// hit sends light along its own cable into the tower and up to the lamp,
// where it lights one panel of the lens. The beacon is the claim: these
// are the ways to reach Shrey. Lighting it opens the end screen (DOM, built
// here so index.html stays content-only) with big contact buttons.

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSetpiece } from '../game/setpieces.js';
import { registerSong, steps } from '../engine/audio.js';
import { InfoBlock, Sign } from '../game/objects.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { disc, pill, stripedSky, noise1 } from '../art/draw.js';
import { makeCanvas, rng, hash2, lerp, overlaps } from '../engine/util.js';

const INK = col('ink.0');
// tower layout, read from the map by the harbor mark before tiles prerender
const geo = { ground: 41, door: 12, wallL: 12, wallR: 21, gallery: 11, top: 12 };

const PAINT = { red: col('#c8323a'), redLo: col('#8f1d24'), white: col('#e8e4da'), whiteLo: col('#a9a8a6') };
const STONE = { hi: col('#8d97ad'), mid: col('#5d6680'), lo: col('#3a4058'), dk: col('#242840') };
const PLANK = { hi: col('#a37850'), mid: col('#7a5536'), lo: col('#523722') };
const ROCK = { hi: col('#5a6278'), mid: col('#3b4258'), lo: col('#272c40') };
const WATER = { a: col('#0d1a3c'), b: col('#13265a') };

// ─── tiles: painted tower walls, a plank dock, rock, iron landings ───

registerKit('lighthouse', {
  terrain(ctx, x, y, m, tx, ty) {
    if (ty < geo.ground) {
      // tower wall: red and white bands of masonry, its cut edge facing in
      const band = Math.floor((ty - geo.top) / 3) % 2 === 0;
      const face = band ? PAINT.red : PAINT.white, lo = band ? PAINT.redLo : PAINT.whiteLo;
      ctx.fillStyle = face; ctx.fillRect(x, y, 16, 16);
      const inner = tx === geo.wallL ? 1 : -1;               // +1: interior is to the right
      ctx.fillStyle = lo;
      if (inner > 0) ctx.fillRect(x + 11, y, 5, 16); else ctx.fillRect(x, y, 5, 16);
      ctx.fillStyle = STONE.dk;                               // the cut face
      if (inner > 0) ctx.fillRect(x + 14, y, 2, 16); else ctx.fillRect(x, y, 2, 16);
      hline(ctx, x + 2, y + 7, 12, lo);
      vline(ctx, x + ((ty & 1) ? 5 : 9), y, 7, lo);
      vline(ctx, x + ((ty & 1) ? 9 : 5), y + 8, 8, lo);
      if (inner > 0) vline(ctx, x, y, 16, INK); else vline(ctx, x + 15, y, 16, INK);
      if (!(m & 1)) { hline(ctx, x, y, 16, INK); ctx.fillStyle = STONE.hi; ctx.fillRect(x, y + 1, 16, 2); }
      if (!(m & 4)) { ctx.fillStyle = STONE.mid; ctx.fillRect(x, y + 12, 16, 4); hline(ctx, x, y + 15, 16, INK); }
      return;
    }
    if (tx < geo.door) {
      // the dock: planks on top, pilings over water below
      ctx.fillStyle = WATER.a; ctx.fillRect(x, y, 16, 16);
      if (!(m & 1)) {
        ctx.fillStyle = PLANK.mid; ctx.fillRect(x, y, 16, 6);
        hline(ctx, x, y, 16, PLANK.hi);
        hline(ctx, x, y + 5, 16, PLANK.lo);
        vline(ctx, x + (tx % 2 ? 7 : 12), y + 1, 4, PLANK.lo);
        hline(ctx, x, y + 6, 16, INK);
        for (let i = 0; i < 16; i += 4) px(ctx, x + i + 1, y + 2, PLANK.lo);
      }
      if (tx % 3 === 1) {
        const top = m & 1 ? y : y + 7;
        ctx.fillStyle = INK; ctx.fillRect(x + 5, top, 6, y + 16 - top);
        ctx.fillStyle = PLANK.lo; ctx.fillRect(x + 6, top, 4, y + 16 - top);
        ctx.fillStyle = PLANK.mid; ctx.fillRect(x + 6, top, 1, y + 16 - top);
      }
      if (m & 1) for (let i = 0; i < 16; i += 5) if (hash2(tx * 16 + i, ty) < 0.4) hline(ctx, x + i, y + 6 + (i % 7), 3, WATER.b);
      return;
    }
    // the rock the tower stands on
    ctx.fillStyle = ROCK.mid; ctx.fillRect(x, y, 16, 16);
    for (let i = 0; i < 3; i++) {
      const h = hash2(tx * 3 + i, ty * 5);
      if (h < 0.6) {
        const sx = x + Math.floor(hash2(tx + i, ty * 9) * 12), sy = y + 4 + Math.floor(h * 10);
        ctx.fillStyle = ROCK.lo; ctx.fillRect(sx, sy, 4, 2);
        px(ctx, sx, sy, ROCK.hi);
      }
    }
    if (!(m & 1)) {
      hline(ctx, x, y, 16, ROCK.hi);
      ctx.fillStyle = col('#4a5268'); ctx.fillRect(x, y + 1, 16, 3);
      hline(ctx, x, y + 4, 16, ROCK.lo);
      if (hash2(tx, ty) < 0.5) { px(ctx, x + 4, y + 2, col('#8fa5b8')); px(ctx, x + 11, y + 3, col('#8fa5b8')); }
    }
  },

  oneway(ctx, x, y, joinL, joinR, tx, ty) {
    if (ty === geo.gallery) {
      // the gallery: a stone slab with brackets under its ends
      ctx.fillStyle = INK; ctx.fillRect(x, y, 16, 8);
      ctx.fillStyle = STONE.mid; ctx.fillRect(x, y, 16, 6);
      hline(ctx, x, y, 16, STONE.hi);
      hline(ctx, x, y + 5, 16, STONE.lo);
      if (!joinL || !joinR) {
        const bx = !joinL ? x + 2 : x + 9;
        for (let i = 0; i < 5; i++) { ctx.fillStyle = INK; ctx.fillRect(bx + (joinL ? i : 0), y + 7 + i, 5 - i + (joinL ? 0 : 0), 1); }
        ctx.fillStyle = STONE.lo; ctx.fillRect(bx + 1, y + 8, 3, 2);
      }
      if (!joinL) vline(ctx, x, y, 7, INK);
      if (!joinR) vline(ctx, x + 15, y, 7, INK);
      return;
    }
    // a landing of the spiral stair: iron treads
    ctx.fillStyle = INK; ctx.fillRect(x, y, 16, 6);
    ctx.fillStyle = col('steel.2'); ctx.fillRect(x, y, 16, 4);
    hline(ctx, x, y, 16, col('steel.4'));
    hline(ctx, x, y + 3, 16, col('steel.1'));
    px(ctx, x + 3, y + 2, col('steel.4')); px(ctx, x + 12, y + 2, col('steel.4'));
    if (!joinL) vline(ctx, x, y, 5, INK);
    if (!joinR) vline(ctx, x + 15, y, 5, INK);
  },
  animated() {},
});

// ─── backdrop: night over the bay ────────────────────────────────────

registerBackground('lighthouse', (W) => {
  const sky = strip(W, (ctx) => stripedSky(ctx, W, H, ['#060918', '#0a0f2c', '#111a43', '#1a2658', '#25356c']));
  const r = rng(808);
  const stars = Array.from({ length: 80 }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * 120), b: r(), tw: r() < 0.3 }));

  const shore = strip(720, (ctx, w) => {
    const n = noise1(17);
    ctx.fillStyle = col('#0a0e24');
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const v = n(t * w * 0.02) * (1 - t) + n((t - 1) * w * 0.02 + 256) * t;
      const top = Math.round(H - 30 - v * 12);
      ctx.fillRect(x, top, 1, H - top);
    }
    const lr = rng(5);
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(lr() * w), y = H - 26 + Math.floor(lr() * 8);
      ctx.fillStyle = col(lr() < 0.7 ? '#ffd27a' : '#ff9d5c');
      ctx.fillRect(x, y, 1, 1);
    }
  });

  // one sailboat, drawn once
  const [boat, bctx] = makeCanvas(40, 44);
  bctx.fillStyle = col('#0b0f24');
  bctx.beginPath(); bctx.moveTo(4, 34); bctx.lineTo(36, 34); bctx.lineTo(31, 41); bctx.lineTo(8, 41); bctx.fill();
  bctx.fillRect(19, 4, 2, 30);
  bctx.fillStyle = col('#1a2450');
  bctx.beginPath(); bctx.moveTo(21, 6); bctx.lineTo(34, 31); bctx.lineTo(21, 31); bctx.fill();
  bctx.beginPath(); bctx.moveTo(18, 9); bctx.lineTo(8, 31); bctx.lineTo(18, 31); bctx.fill();

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      const camMax = geo.ground * TILE + 3 * TILE - H;
      const alt = Math.max(0, camMax - camY) * k;           // 0 on the dock, grows as you climb
      ctx.drawImage(sky, 0, 0);
      for (const s of stars) {
        if (s.tw && ((t + s.x * 7) >> 4) % 9 === 0) continue;
        ctx.fillStyle = s.b > 0.85 ? '#fbf8f1' : s.b > 0.5 ? '#a8b4d8' : '#5d6a9a';
        ctx.fillRect(s.x, s.y, 1, 1);
        if (s.b > 0.95) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
      }
      // a crescent moon
      const mx = Math.round(ctx.W * 0.16), my = 44;
      disc(ctx, mx, my, 9, '#f4ead0');
      disc(ctx, mx + 4, my - 3, 8, '#0b1131');
      // the far shore and its town, then open water down to the dock
      const hy = Math.round(132 + alt * 0.08);
      blitStrip(ctx, shore, camX, 0.05 * k, hy - H + 2);
      const sea = [col('#13224f'), col('#0f1c44'), col('#0b1638'), col('#08112c')];
      for (let y = hy; y < H; y++) {
        ctx.fillStyle = sea[Math.min(3, Math.floor((y - hy) / 14))];
        ctx.fillRect(0, y, ctx.W, 1);
      }
      // wave glints drift with the swell; the moon lays a path on the water
      for (let row = 0; row * 7 + hy + 3 < H; row++) {
        const y = hy + 3 + row * 7;
        const step = 34 + row * 6;
        const off = Math.floor((t * (0.2 + row * 0.05) * k + row * 13 - camX * 0.1 * k)) % step;
        ctx.fillStyle = row < 3 ? '#2a3f7a' : '#223566';
        for (let x = -step + off; x < ctx.W; x += step) ctx.fillRect(x, y, 4 + (row % 3) * 2, 1);
        if ((t >> 4) % 3 !== row % 3) { ctx.fillStyle = '#c9c0a2'; ctx.fillRect(mx - 3 + ((row * 5) % 7) - 3, y, 3 + (row % 2) * 3, 1); }
      }
      // moored boats ride the swell, and sink away below as you climb
      const by = hy + 34 + alt * 0.55;
      if (by < H + 10) {
        [[0.12, 0], [0.88, 40]].forEach(([fx, ph]) => {
          const x = Math.round(ctx.W * fx - 20 - camX * 0.3 * k);
          const y = Math.round(by - 40 + Math.sin((t + ph) / 40) * 1.5 * (k || 0));
          ctx.drawImage(boat, x, y);
          ctx.fillStyle = (t + ph * 3) % 120 < 80 ? '#ffd27a' : '#c98a3c';
          ctx.fillRect(x + 19, y + 3, 2, 2);
        });
      }
    },
  };
});

// ─── the tower inside: curved back wall, newel, stair, gallery rails ─

function paintTower(level) {
  const map = level.map;
  const [c, g] = makeCanvas(map.w, map.h);
  const x0 = (geo.wallL + 1) * TILE, x1 = geo.wallR * TILE;
  const y0 = (geo.gallery + 1) * TILE, y1 = geo.ground * TILE;
  // back wall: shaded like the inside of a cylinder, with courses of stone
  const shade = ['#1a1d33', '#232842', '#2b314e', '#30375a', '#2b314e', '#232842', '#1a1d33'];
  for (let x = x0; x < x1; x++) {
    const k = (x - x0) / (x1 - x0);
    g.fillStyle = col(shade[Math.min(shade.length - 1, Math.floor(k * shade.length))]);
    g.fillRect(x, y0, 1, y1 - y0);
  }
  g.fillStyle = col('#1d2138');
  for (let y = y0 + 6; y < y1; y += 8) {
    g.fillRect(x0, y, x1 - x0, 1);
    for (let x = x0 + ((y >> 3) % 2 ? 6 : 14); x < x1; x += 16) g.fillRect(x, y - 7, 1, 7);
  }
  // slit windows onto the night
  for (const wy of [y0 + 40, y0 + 168, y0 + 296]) {
    const wx = Math.round((x0 + x1) / 2) - 4;
    g.fillStyle = INK; g.fillRect(wx - 1, wy - 1, 10, 26);
    g.fillStyle = col('#16224e'); g.fillRect(wx, wy, 8, 24);
    g.fillStyle = col('#fbf8f1'); g.fillRect(wx + 5, wy + 6, 1, 1);
    g.fillStyle = col('#2a3a74'); g.fillRect(wx, wy + 18, 8, 6);
  }
  // the newel post and the stair stringers between landings
  const nx = Math.round((x0 + x1) / 2);
  g.fillStyle = INK; g.fillRect(nx - 3, y0, 6, y1 - y0);
  g.fillStyle = col('steel.2'); g.fillRect(nx - 2, y0, 4, y1 - y0);
  g.fillStyle = col('steel.3'); g.fillRect(nx - 2, y0, 1, y1 - y0);
  const lands = [];
  for (let ty = geo.gallery + 1; ty < geo.ground; ty++) {
    const row = map.chars[ty];
    const a = row.indexOf('='), b = row.lastIndexOf('=');
    if (a >= 0) lands.push({ y: ty * TILE, a: a * TILE, b: (b + 1) * TILE });
  }
  lands.push({ y: y1, a: x0, b: x1 });
  lands.sort((p, q) => q.y - p.y);
  for (let i = 0; i + 1 < lands.length; i++) {
    const lo = lands[i], hi = lands[i + 1];
    // a flight climbs from the inner end of one landing to the next one
    // from the newel end of one landing up across to the wall end of the next
    const fromX = lo.a > nx - 8 ? lo.a : lo.b, toX = hi.a > nx - 8 ? hi.b - 6 : hi.a + 6;
    const n = 7;
    for (let s = 0; s < n; s++) {
      const x = Math.round(lerp(fromX, toX, s / n)), y = Math.round(lerp(lo.y, hi.y, s / n));
      g.fillStyle = INK; g.fillRect(x - 4, y - 3, 9, 4);
      g.fillStyle = col('#4a536f'); g.fillRect(x - 3, y - 3, 7, 2);
    }
  }
  // gallery railings outside the lantern
  const gy = geo.gallery * TILE;
  const ga = map.chars[geo.gallery].indexOf('=') * TILE, gb = (map.chars[geo.gallery].lastIndexOf('=') + 1) * TILE;
  for (const [ra, rb] of [[ga, x0 - 4], [x1 + 4, gb]]) {
    g.fillStyle = INK; g.fillRect(ra, gy - 14, rb - ra, 3); g.fillRect(ra, gy - 7, rb - ra, 2);
    g.fillStyle = col('steel.3'); g.fillRect(ra, gy - 13, rb - ra, 1);
    for (let x = ra; x <= rb; x += 8) { g.fillStyle = INK; g.fillRect(x, gy - 14, 2, 14); }
  }
  // base: the tower's foot flares onto the rock
  const fx0 = geo.wallL * TILE - 10, fx1 = (geo.wallR + 1) * TILE + 10;
  g.fillStyle = INK; g.fillRect(fx0 - 1, y1 - 13, fx1 - fx0 + 2, 13);
  g.fillStyle = STONE.mid; g.fillRect(fx0, y1 - 12, fx1 - fx0, 12);
  g.fillStyle = STONE.hi; g.fillRect(fx0, y1 - 12, fx1 - fx0, 2);
  g.fillStyle = STONE.lo; for (let x = fx0 + 8; x < fx1; x += 14) g.fillRect(x, y1 - 10, 1, 10);
  g.clearRect(x0 - TILE, y1 - 2 * TILE, TILE, 2 * TILE);    // keep the doorway open
  return c;
}

class Harbor {
  constructor(tx, ty, spec, level) {
    const map = level.map;
    geo.ground = ty + 1;
    geo.door = spec.door;
    const probe = map.chars[geo.ground - 6];
    geo.wallL = probe.indexOf('#');
    geo.wallR = probe.lastIndexOf('#');
    let top = geo.ground - 1;
    while (top > 0 && map.chars[top - 1][geo.wallR] === '#') top--;
    geo.top = top;
    geo.gallery = top - 1;
    this.canvas = paintTower(level);
    this.level = level;
  }
  back(ctx, cam) {
    ctx.drawImage(this.canvas, -cam.x, -cam.y);
    // the door frame
    const dx = geo.wallL * TILE - cam.x, dy = (geo.ground - 2) * TILE - cam.y;
    ctx.fillStyle = INK; ctx.fillRect(dx - 2, dy - 6, 20, 6);
    ctx.fillStyle = STONE.hi; ctx.fillRect(dx - 1, dy - 5, 18, 2);
    ctx.fillStyle = col('#ffd27a'); ctx.fillRect(dx + 3, dy - 3, 10, 1);
  }
}

// ─── signal boxes: a contact block hung from a dock lamp post ────────

const GLYPH = {
  mail: ['xxxxxxxxxx', 'xx......xx', 'x.x....x.x', 'x..x..x..x', 'x...xx...x', 'x........x', 'xxxxxxxxxx'],
  card: ['xxxxxxxxxx', 'x........x', 'x.xx.xxx.x', 'x.xx.....x', 'x....xxx.x', 'x.xx.....x', 'x........x', 'xxxxxxxxxx'],
  code: ['..xx....xx', '..xx....xx', '...x....x.', '...xxxxxx.', '...x......', '..xx......', '..xx......'],
};

const boxCache = new Map();
function boxArt(glyph, ramp, lit) {
  const key = glyph + ramp + lit;
  if (boxCache.has(key)) return boxCache.get(key);
  const [c, g] = makeCanvas(16, 16);
  g.fillStyle = INK; g.fillRect(0, 0, 16, 16);
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]]) g.clearRect(x, y, 1, 1);
  g.fillStyle = col(ramp + '.2'); g.fillRect(1, 1, 14, 14);
  hline(g, 1, 1, 14, col(ramp + '.3')); vline(g, 1, 1, 13, col(ramp + '.3'));
  hline(g, 1, 14, 14, col(ramp + '.0')); vline(g, 14, 2, 13, col(ramp + '.0'));
  g.fillStyle = lit ? col(ramp + '.1') : '#0f1430'; g.fillRect(3, 3, 10, 10);
  const map = GLYPH[glyph];
  const ox = Math.floor((16 - map[0].length) / 2), oy = Math.floor((16 - map.length) / 2);
  g.fillStyle = lit ? col('white.2') : col(ramp + '.3');
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') g.fillRect(ox + i, oy + j, 1, 1); }));
  boxCache.set(key, c);
  return c;
}

class SignalBox extends InfoBlock {
  constructor(tx, ty, fact, glyph, ramp) { super(tx, ty, fact); this.glyph = glyph; this.ramp = ramp; }
  draw(ctx, cam, t) {
    const off = this.bump > 0 ? -Math.round(Math.sin(((8 - this.bump) / 8) * Math.PI) * 5) : 0;
    const x = this.x - cam.x, y = this.y - cam.y + off;
    ctx.drawImage(boxArt(this.glyph, this.ramp, this.used), x, y);
    if (!this.used && ((t >> 3) & 15) === 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 2, y + 2, 12, 1); }
  }
}

class Signal {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.fact = spec.fact;
    this.ramp = spec.color;
    const f = level.game.content.get(spec.fact);
    this.label = f ? f.title : spec.fact;
    this.box = new SignalBox(tx, ty, spec.fact, spec.glyph, spec.color);
    level.addBlock(this.box);
    this.lane = level.setpieces.filter((s) => s instanceof Signal).length;
    this.postX = tx * TILE + 22;
    this.armY = ty * TILE - 10;
    this.groundY = geo.ground * TILE;
    this.send = -1;                     // how far the light has travelled since the box was hit
    this._path = null;
  }
  // built on first use: the lamp's mark comes later in the map scan
  get path() { return this._path || (this._path = this.route()); }
  get on() { return this.level.game.progress.hasFact(this.fact); }

  // post → along the dock face → in at the door → up the inside wall → the lamp
  route() {
    const i = this.lane;
    const gy = this.groundY + 3 + i * 3;
    const wallX = geo.wallR * TILE - 5 - i * 4;
    const lampX = beaconAt.x - 6 + i * 6, lampY = beaconAt.y - 4;
    const pts = [[this.postX + 1, this.armY + 8], [this.postX + 1, gy], [wallX, gy], [wallX, (geo.gallery + 1) * TILE + 2],
      [lampX, (geo.gallery + 1) * TILE + 2], [lampX, lampY]];
    let len = 0;
    const segs = [];
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      const l = Math.abs(bx - ax) + Math.abs(by - ay);
      segs.push({ ax, ay, bx, by, l, at: len });
      len += l;
    }
    return { segs, len };
  }
  pointAt(d) {
    for (const s of this.path.segs) {
      if (d <= s.at + s.l) { const k = (d - s.at) / (s.l || 1); return [lerp(s.ax, s.bx, k), lerp(s.ay, s.by, k)]; }
    }
    const s = this.path.segs[this.path.segs.length - 1];
    return [s.bx, s.by];
  }
  onFact(id) { if (id === this.fact) this.send = 0; }
  update() { if (this.send >= 0) { this.send += 6; if (this.send > this.path.len) this.send = -1; } }

  back(ctx, cam, t) {
    const ox = -cam.x, oy = -cam.y;
    const on = this.on;
    // cable: dim until linked, then lit, with a pulse every few seconds
    const c = on ? col(this.ramp + '.2') : col('slate.1');
    for (const s of this.path.segs) {
      ctx.fillStyle = INK;
      ctx.fillRect(Math.min(s.ax, s.bx) + ox - 1, Math.min(s.ay, s.by) + oy - 1, Math.abs(s.bx - s.ax) + 3, Math.abs(s.by - s.ay) + 3);
    }
    ctx.fillStyle = c;
    for (const s of this.path.segs) ctx.fillRect(Math.min(s.ax, s.bx) + ox, Math.min(s.ay, s.by) + oy, Math.abs(s.bx - s.ax) + 1, Math.abs(s.by - s.ay) + 1);
    const pulse = this.send >= 0 ? this.send : on && !this.level.game.reduced ? (t * 3 + this.lane * 300) % (this.path.len + 600) : -1;
    if (pulse >= 0 && pulse <= this.path.len) {
      for (let k = 0; k < 4; k++) {
        const [x, y] = this.pointAt(Math.max(0, pulse - k * 5));
        ctx.fillStyle = k ? col(this.ramp + '.3') : '#fbf8f1';
        ctx.fillRect(Math.round(x + ox) - 1, Math.round(y + oy) - 1, 3, 3);
      }
    }
    // the lamp post with its arm over the box
    const px0 = this.postX + ox, top = this.armY - 12 + oy;
    ctx.fillStyle = INK; ctx.fillRect(px0 - 2, top, 5, this.groundY - this.armY + 12);
    ctx.fillStyle = col('steel.2'); ctx.fillRect(px0 - 1, top, 3, this.groundY - this.armY + 12);
    ctx.fillStyle = INK; ctx.fillRect(this.box.x + ox + 2, this.armY + oy - 1, this.postX - this.box.x - 2, 3);
    ctx.fillStyle = col('steel.3'); ctx.fillRect(this.box.x + ox + 3, this.armY + oy, this.postX - this.box.x - 3, 1);
    for (const hx of [this.box.x + 4, this.box.x + 11]) { ctx.fillStyle = col('steel.1'); ctx.fillRect(hx + ox, this.armY + oy + 2, 1, this.box.y - this.armY - 2); }
    // lamp head: dark until its contact is logged
    const ly = top - 8;
    ctx.fillStyle = INK; ctx.fillRect(px0 - 4, ly - 1, 9, 10);
    ctx.fillStyle = on ? col(this.ramp + '.3') : col('slate.2'); ctx.fillRect(px0 - 3, ly, 7, 8);
    if (on) {
      ctx.fillStyle = '#fbf8f1'; ctx.fillRect(px0 - 1, ly + 2, 3, 4);
      ctx.fillStyle = `rgba(255,224,138,${0.1 + 0.04 * Math.sin(t / 15)})`;
      ctx.beginPath(); ctx.arc(px0 + 0.5, ly + 4, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = INK; ctx.fillRect(px0 - 5, ly - 3, 11, 3);
    drawText(ctx, this.label, px0, ly - 15, on ? col(this.ramp + '.3') : '#a9b0c9', { align: 'center', shadow: '#0b0d17', size: 7, weight: 700 });
  }
}

// ─── the lamp: lantern room, lens, plaque, the beam and the finale ───

const beaconAt = { x: 0, y: 0 };

class Plaque extends Sign {
  constructor(x, y, fact, beacon) {
    super(0, 0, fact, true);
    this.x = x - 12; this.y = y - 18; this.w = 24; this.h = 18;
    this.beacon = beacon;
  }
  draw() {}                             // the beacon draws the plaque on the lantern
}

class Beacon {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = (tx + 1) * TILE;           // the lamp spans two tiles; this is its centre
    this.floor = (ty + 1) * TILE;
    beaconAt.x = this.x; beaconAt.y = this.floor - 8;
    this.fact = spec.plaque;
    const f = level.game.content.get(spec.plaque);
    this.title = f ? f.title : spec.plaque;
    this.plaque = new Plaque(this.x, this.floor, spec.plaque, this);
    level.objects.push(this.plaque);
    this.lit = false;
    this.t = 0;
    this.angle = 0;
    this.rainbow = false;
  }

  update(level) {
    const h = level.hero;
    if (!this.lit && h.state === 'normal' && overlaps(h, this.plaque) && level.game.progress.hasFact(this.fact)) this.light(level);
    if (this.lit) {
      this.t++;
      if (level.game.reduced) this.angle = 0.7;          // reduced motion: a steady beam, no sweep
      else this.angle += 0.035;
      if (this.t === 150) this.finish(level);
    }
  }

  light(level) {
    const g = level.game;
    this.lit = true;
    this.t = 0;
    this.rainbow = factsFound(g) >= g.content.total;      // every fact on the island: a rainbow beam
    const h = level.hero;
    h.setState('victory');
    h.vx = 0;
    level.sfx('clear');
    g.audio.music(null);
    level.camera.shake(0.3);
    for (let i = 0; i < 4; i++) {
      level.after(i * 9, () => g.particles.burst(this.x, this.floor - 26, 14, [col('gold.3'), col('white.2'), col('cyan.3')], { speed: 2.2, up: 1.6, life: 50, grav: 0.04 }));
    }
    g.ui.hud.announce('The beacon is lit.');
  }

  finish(level) {
    const g = level.game;
    g.progress.clear(level.def.node);
    openFinale(g, level);
  }

  back(ctx, cam, t) {
    const ox = -cam.x, oy = -cam.y;
    const cx = this.x + ox, fy = this.floor + oy;
    if (fy < -40 || fy - 110 > H) return;
    // the lantern: iron frame, glass panes, a domed roof
    const w = 6 * TILE, gx = cx - w / 2, gtop = fy - 62;
    ctx.fillStyle = 'rgba(120,170,220,0.10)'; ctx.fillRect(gx, gtop, w, 54);
    ctx.fillStyle = INK;
    for (let i = 0; i <= 4; i++) ctx.fillRect(Math.round(gx + (i * w) / 4) - 1, gtop, 3, 54);
    ctx.fillRect(gx - 2, gtop - 2, w + 4, 4); ctx.fillRect(gx - 2, fy - 10, w + 4, 4);
    ctx.fillStyle = col('steel.3');
    for (let i = 0; i <= 4; i++) ctx.fillRect(Math.round(gx + (i * w) / 4), gtop, 1, 54);
    // roof and vent
    for (let i = 0; i < 18; i++) {
      const half = Math.round((w / 2 + 6) * Math.sqrt(1 - (i / 18) * (i / 18)));
      ctx.fillStyle = i === 0 ? INK : i < 3 ? PAINT.redLo : PAINT.red;
      ctx.fillRect(cx - half, gtop - 2 - i, half * 2, 1);
    }
    ctx.fillStyle = INK; ctx.fillRect(cx - 4, gtop - 26, 8, 7);
    ctx.fillStyle = col('steel.3'); ctx.fillRect(cx - 3, gtop - 25, 6, 5);
    ctx.fillStyle = INK; ctx.fillRect(cx - 1, gtop - 32, 2, 7);
    // the plaque on the lantern's crown band
    const found = this.level.game.progress.hasFact(this.fact);
    const tw = Math.ceil(textWidth(this.title, 6.5, 700)) + 10;
    pill(ctx, cx - tw / 2, gtop - 13, tw, lineHeight(6.5) + 2, '#7a5a1c', '#2a1d08', 2);
    drawText(ctx, this.title, cx, gtop - 12, '#ffe08a', { align: 'center', size: 6.5, weight: 700 });
    if (!this.lit) {
      const label = 'Light the beacon';
      const lw = Math.ceil(textWidth(label, 7)) + 10, lh = lineHeight(7) + 4;
      const bob = Math.round(Math.sin(t / 20));
      pill(ctx, cx - lw / 2, gtop + 4 + bob, lw, lh, 'rgba(16,20,42,0.92)', '#ffd166', 3);
      drawText(ctx, label, cx, gtop + 6 + bob, '#ffd166', { align: 'center', size: 7 });
    }
    // pedestal
    ctx.fillStyle = INK; ctx.fillRect(cx - 9, fy - 12, 18, 12);
    ctx.fillStyle = col('steel.2'); ctx.fillRect(cx - 8, fy - 11, 16, 11);
    ctx.fillStyle = col('steel.3'); ctx.fillRect(cx - 8, fy - 11, 16, 2);
  }

  draw(ctx, cam, t) {
    const ox = -cam.x, oy = -cam.y;
    const cx = this.x + ox, ly = this.floor - 26 + oy;
    if (ly < -60 || ly - 60 > H) return;
    // the beam sweeps round: two opposite shafts, foreshortened as they turn
    if (this.lit) {
      const fade = Math.min(1, this.t / 40);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const a of [this.angle, this.angle + Math.PI]) {
        const dx = Math.cos(a), toward = Math.sin(a);
        const len = 420 * Math.abs(dx);
        if (len < 8) continue;
        const hue = this.rainbow ? `hsla(${(t * 2 + (a > this.angle ? 180 : 0)) % 360},90%,70%,` : 'rgba(255,214,120,';
        const k = (0.34 + 0.26 * Math.max(0, toward)) * fade;
        const grd = ctx.createLinearGradient(cx, ly, cx + dx * len, ly);
        grd.addColorStop(0, hue + k + ')'); grd.addColorStop(1, hue + '0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.moveTo(cx, ly - 4); ctx.lineTo(cx + dx * len, ly - 34); ctx.lineTo(cx + dx * len, ly + 30); ctx.lineTo(cx, ly + 4); ctx.fill();
      }
      const halo = ctx.createRadialGradient(cx, ly, 2, cx, ly, 70);
      halo.addColorStop(0, `rgba(255,214,120,${0.35 * fade})`); halo.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = halo; ctx.fillRect(cx - 70, ly - 70, 140, 140);
      const flash = Math.max(0, Math.sin(this.angle)) ** 8;
      ctx.fillStyle = `rgba(255,240,200,${(0.25 + flash * 0.5) * fade})`;
      ctx.beginPath(); ctx.arc(cx, ly, 10 + flash * 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // the lens: one panel per contact, lit as each is linked
    const panels = this.level.setpieces.filter((s) => s instanceof Signal);
    ctx.fillStyle = INK; ctx.fillRect(cx - 10, ly - 13, 20, 26);
    const pw = 18 / Math.max(1, panels.length);
    panels.forEach((s, i) => {
      const on = this.lit || s.on;
      ctx.fillStyle = this.lit ? (this.rainbow ? `hsl(${(t * 3 + i * 120) % 360},90%,72%)` : '#fff3c4') : on ? col(s.ramp + '.2') : col('slate.1');
      ctx.fillRect(Math.round(cx - 9 + i * pw), ly - 12, Math.ceil(pw) - 1, 24);
      if (on) { ctx.fillStyle = this.lit ? '#ffffff' : col(s.ramp + '.3'); ctx.fillRect(Math.round(cx - 9 + i * pw) + 1, ly - 10, 1, 20); }
    });
    for (let r = 0; r < 3; r++) { ctx.fillStyle = 'rgba(11,13,23,0.35)'; ctx.fillRect(cx - 9, ly - 8 + r * 8, 18, 1); }
  }
}

// ─── the end screen ─────────────────────────────────────────────────

const factsFound = (game) => [...game.progress.facts].filter((id) => game.content.get(id)).length;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let finale = null;

function buildFinale() {
  const style = document.createElement('style');
  style.textContent = `
.menu--finale { width: min(640px, 100vw - 32px); }
.finale__links { display: grid; gap: 12px; margin-top: 20px; }
.finale__pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.finale__mail { display: flex; gap: 12px; }
.finale__link { flex: 1; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 68px; text-align: left; text-decoration: none; }
.finale__link b { font-size: 21px; font-weight: 700; }
.finale__link span { font-family: var(--read); font-size: 15px; font-weight: 400; opacity: 0.85; overflow-wrap: anywhere; }
.finale__copy { flex: none; }
.finale__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0 0; }
.finale__stats div { padding: 8px 12px; border-radius: 12px; background: var(--panel-2); }
.finale__stats dt { color: var(--muted); font-family: var(--display); font-size: 14px; }
.finale__stats dd { margin: 0; color: var(--gold); font-family: var(--display); font-weight: 700; font-size: 20px; }
.finale__open { display: flex; gap: 10px; align-items: baseline; margin: 12px 0 0; color: var(--text); font-family: var(--display); font-weight: 600; font-size: 18px; line-height: 1.35; }
.finale__open::before { content: ""; flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 4px rgba(126, 224, 138, 0.2); }
.finale__open[hidden] { display: none; }
@media (max-width: 540px) { .finale__pair, .finale__stats { grid-template-columns: 1fr 1fr; } .finale__mail { flex-direction: column; } }`;
  document.head.appendChild(style);

  const d = document.createElement('dialog');
  d.className = 'menu menu--finale';
  d.id = 'finale';
  d.setAttribute('aria-labelledby', 'finale-title');
  d.innerHTML = `
    <p class="menu__kicker">Beacon lit</p>
    <h2 class="menu__title" id="finale-title">Thanks for playing</h2>
    <p class="finale__open" id="finale-open" hidden></p>
    <p class="menu__sub" id="finale-sub"></p>
    <div class="finale__links" id="finale-links"></div>
    <dl class="finale__stats" id="finale-stats"></dl>
    <p class="tally__note" id="finale-note"></p>
    <div class="menu__list">
      <button class="pbtn" type="button" data-finale="resume">Read the full résumé</button>
      <button class="pbtn pbtn--quiet" type="button" data-finale="map" id="finale-map"></button>
    </div>`;
  (document.getElementById('game') || document.body).appendChild(d);
  return d;
}

function contactLink(game, id) {
  const f = game.content.get(id);
  const a = f && f.el.querySelector('a[href]');
  return a ? { title: f.title, href: a.getAttribute('href'), text: a.textContent.trim() } : null;
}

function openFinale(game, level) {
  if (!finale) finale = buildFinale();
  const d = finale;
  const P = game.progress, C = game.content;
  const mail = contactLink(game, 'c-email'), li = contactLink(game, 'c-linkedin'), gh = contactLink(game, 'c-github');
  const ext = (l, primary) => `<a class="pbtn ${primary ? 'pbtn--primary ' : ''}finale__link" href="${esc(l.href)}"${l.href.startsWith('mailto:') ? '' : ' target="_blank" rel="me noopener"'}><b>${esc(l.title)}</b><span>${esc(l.text)}</span></a>`;
  const links = d.querySelector('#finale-links');
  links.innerHTML =
    (mail ? `<div class="finale__mail">${ext(mail, true)}<button class="pbtn finale__copy" type="button" data-finale="copy">Copy email</button></div>` : '') +
    `<div class="finale__pair">${[li, gh].filter(Boolean).map((l) => ext(l, false)).join('')}</div>`;
  d.querySelector('#finale-sub').textContent = 'The quickest ways to reach Shrey:';
  // the open-to-work line, once its wording is confirmed (no data-flag="inference")
  const open = C.get('c-open'), openEl = d.querySelector('#finale-open');
  const confirmed = open && !open.el.matches('[data-flag="inference"]');
  openEl.textContent = confirmed ? open.el.textContent.trim() : '';
  openEl.hidden = !confirmed;

  const found = factsFound(game);
  const skills = C.skills.filter((s) => P.hasSkill(s.name)).length;
  const secs = Math.round(performance.now() / 1000);          // since the page opened
  const rows = [['Facts', `${found}/${C.total}`], ['Skills', `${skills}/${C.skills.length}`],
    ['Bugs fixed', String(P.stats.bugs || 0)], ['This visit', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`]];
  d.querySelector('#finale-stats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const left = C.total - found;
  d.querySelector('#finale-note').textContent = left > 0
    ? `${left} fact${left > 1 ? 's' : ''} still out on the island, or all of them in the résumé.`
    : 'Every fact found. Thanks for reading all of it.';
  d.querySelector('#finale-map').textContent = left > 0 ? `Keep exploring (${left} fact${left > 1 ? 's' : ''} left)` : 'Back to the map';

  let action = 'map';
  const onClick = (e) => {
    const b = e.target.closest('[data-finale]');
    if (!b) return;
    if (b.dataset.finale === 'copy') {
      const addr = mail ? mail.href.replace(/^mailto:/, '') : '';
      const done = () => { b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, () => { b.textContent = addr; });
      else b.textContent = addr;
      return;
    }
    action = b.dataset.finale;
    d.close();
  };
  const onClose = () => {
    d.removeEventListener('click', onClick);
    game.audio.duck(false);
    game.input.lockAll();
    game.resume('finale');
    game.focusStage();
    game.goMap(level.def.node, level.def.node);
    if (action === 'resume') game.openResume(level.def.node);
  };
  d.addEventListener('click', onClick);
  d.addEventListener('close', onClose, { once: true });
  game.pause('finale');
  game.audio.duck(true);
  d.showModal();
  const first = d.querySelector('.finale__link');
  if (first) first.focus();
}

registerSetpiece('lighthouse.tower', Harbor);
registerSetpiece('lighthouse.signal', Signal);
registerSetpiece('lighthouse.beacon', Beacon);

// ─── music: a slow tide in A minor ──────────────────────────────────

registerSong('lighthouse', {
  bpm: 88,
  lead: steps('A4 . C5 . E5 . C5 . | F4 . A4 . C5 . A4 . | C5 . E5 . G5 . E5 . | B4 . D5 . G5 . . .'),
  bass: steps('A2 . . . E3 . . . | F2 . . . C3 . . . | C3 . . . G3 . . . | G2 . . . D3 . . .'),
  drums: steps('k . . . h . . . | k . . . h . . h | k . . . h . . . | k . . . h . s .'),
});

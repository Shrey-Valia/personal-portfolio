// Contact · the end of the path. A night harbour: he hops down to the dock
// and walks it, and each of three lamp posts lights as he passes, its
// hanging sign showing one way to reach him (envelope, card, code: the
// same glyphs as the card's buttons). Their light runs along cables up the
// lighthouse while he climbs its ladder; at the gallery he lights the
// beacon, turns and waves. The email, LinkedIn and GitHub buttons and the
// open-to-work line are the card's HTML; the scene draws no words.
//
// The page ends this stop in its hold (layout.js endP), so the hold is the
// finished harbour: the beam sweeps once with the scroll and the beacon
// flickers on the idle clock (≤ 8 fps). There is no walk in (he starts at
// the top of the scene, where the root ladder's planks left him) and the
// out phase is only ever seen on the bench.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 11, §3. Contract: docs/BUILDING-STOPS.md.

import { drawPath, sky, fadeEdges, coreX, FLOOR } from '../kit.js';
import { col } from '../../art/palette.js';
import { makeCanvas, rng, clamp, lerp, ease } from '../../engine/util.js';

const INK = col('ink.0');
const R = (g, x, y, w, h, c) => { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), w, h); };

// lighthouse.js's palette
const PAINT = { red: '#c8323a', redLo: '#8f1d24', white: '#e8e4da', whiteLo: '#a9a8a6' };
const STONE = { hi: '#8d97ad', mid: '#5d6680', lo: '#3a4058', dk: '#242840' };
const PLANK = { hi: '#a37850', mid: '#7a5536', lo: '#523722' };
const ROCK = { hi: '#5a6278', mid: '#3b4258', lo: '#272c40' };

// the contacts, in the game's order and colours (its lighthouse level)
const GLYPH = {
  mail: ['xxxxxxxxxx', 'xx......xx', 'x.x....x.x', 'x..x..x..x', 'x...xx...x', 'x........x', 'xxxxxxxxxx'],
  card: ['xxxxxxxxxx', 'x........x', 'x.xx.xxx.x', 'x.xx.....x', 'x....xxx.x', 'x.xx.....x', 'x........x', 'xxxxxxxxxx'],
  code: ['..xx....xx', '..xx....xx', '...x....x.', '...xxxxxx.', '...x......', '..xx......', '..xx......'],
};
const LAMPS = [{ x: 30, glyph: 'mail', ramp: 'gold' }, { x: 52, glyph: 'card', ramp: 'cyan' }, { x: 74, glyph: 'code', ramp: 'green' }];

// ─── where things are (x from the core's left edge) ───────────────────

const HORIZON = 54;
const DOCK = FLOOR;                  // the planks he walks
const LAND = 16;                     // where he lands on the dock
const FOOT = 105;                    // the ladder's foot (he stands here to climb)
const LADDER = 110;                  // the ladder on the tower's face
const TOWER = [112, 130];            // the tower's walls
const GALLERY = 34;                  // the gallery floor round the lantern
const STAND = 107;                   // where he stands on the gallery
const BEACON = [121, 28];            // the lamp's centre

// the act, step by step: [start, step]
const STEPS = [[0, 'hop'], [0.14, 'land'], [0.19, 'walk'], [0.5, 'turn'], [0.53, 'climb'], [0.78, 'step'], [0.82, 'light'], [0.9, 'wave'], [1.01, 'end']];

// where he is at act k (0–1) and how he looks; X maps core x to scene x
function at(k, X, enter, dir = 1, still = false) {
  k = clamp(k, 0, 1);
  let i = 0;
  while (k >= STEPS[i + 1][0]) i++;
  const [a, step] = STEPS[i], u = clamp((k - a) / (STEPS[i + 1][0] - a), 0, 1);
  switch (step) {
    case 'hop': {
      // off the planks above and down onto the dock: a short rise, then the fall
      const x = lerp(enter[0], X(LAND), u), y = DOCK * u * u - 10 * u * (1 - u);
      const vy = (2 * DOCK * u - 10 * (1 - 2 * u)) * dir;
      return { x, y, pose: vy < 0 ? 'jump' : 'fall', facing: -dir, step };
    }
    case 'land': return { x: X(LAND), y: DOCK, pose: still || u > 0.5 ? 'idle' : 'crouch', facing: 1, step };
    case 'walk': {
      const x = lerp(X(LAND), X(FOOT), u);
      return { x, y: DOCK, pose: still ? 'idle' : 'run', frame: Math.floor((x - X(LAND)) / 5) % 4, facing: dir, step };
    }
    case 'turn': return { x: X(FOOT), y: DOCK, pose: 'idle', facing: 1, step };
    case 'climb': {
      const y = lerp(DOCK, GALLERY, u);
      return { x: X(FOOT), y, pose: 'climb', frame: Math.floor(y / 5) % 2, facing: 1, step };
    }
    case 'step': return { x: lerp(X(FOOT), X(STAND), u), y: GALLERY, pose: u < 0.5 ? 'crouch' : 'idle', facing: 1, step };
    case 'light': return { x: X(STAND), y: GALLERY, pose: 'point', facing: 1, step };
    default: return { x: X(STAND), y: GALLERY, pose: 'idle', facing: -1, step: 'wave' };
  }
}

// the act at which he passes lamp i (it lights), from the walk's mapping
const walkAt = (x) => STEPS[2][0] + (STEPS[3][0] - STEPS[2][0]) * clamp((x - LAND) / (FOOT - LAND), 0, 1);
const LIT_AT = LAMPS.map((l) => walkAt(l.x - 3));
const IGNITE = [0.82, 0.9];          // the beacon comes up over these acts

// ─── painting ─────────────────────────────────────────────────────────

function boat(g, x, wl, s, light) {
  // a moored sailboat, dark against the water; s scales it (1 = near)
  const hw = Math.round(9 * s), mh = Math.round(18 * s);
  g.fillStyle = col('#0b0f24');
  g.beginPath(); g.moveTo(x - hw, wl - 3 * s); g.lineTo(x + hw, wl - 3 * s); g.lineTo(x + hw - 3 * s, wl + 1); g.lineTo(x - hw + 3 * s, wl + 1); g.fill();
  g.fillRect(Math.round(x), wl - 3 * s - mh, 1, mh);
  g.fillStyle = col('#1a2450');
  g.beginPath(); g.moveTo(x + 1, wl - 3 * s - mh + 2); g.lineTo(x + hw - 1, wl - 4 * s); g.lineTo(x + 1, wl - 4 * s); g.fill();
  g.beginPath(); g.moveTo(x - 1, wl - 3 * s - mh + 5); g.lineTo(x - hw + 2, wl - 4 * s); g.lineTo(x - 1, wl - 4 * s); g.fill();
  if (light) R(g, x, wl - 3 * s - mh - 1, 1, 1, '#ffd27a');
}

function paintBack(w, h, X) {
  const [c, g] = makeCanvas(w, h);
  sky(g, w, HORIZON, ['#0a0f2c', '#111a43', '#1a2658', '#25356c']);
  // stars, a crescent moon top left
  const r = rng(808);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * w), y = 2 + Math.floor(r() * (HORIZON - 8)), b = r();
    if (Math.abs(x - X(20)) < 10 && Math.abs(y - 14) < 10) continue;
    if (x > X(100) && x < X(140) && y > 4) continue;
    R(g, x, y, 1, 1, b > 0.85 ? '#fbf8f1' : b > 0.5 ? '#a8b4d8' : '#5d6a9a');
  }
  const mx = X(20), my = 14;
  for (let y = -6; y <= 6; y++) {
    const a = Math.floor(Math.sqrt(36 - y * y + 4.8));
    for (let x = -a; x <= a; x++) {
      const dx = x - 3, dy = y + 2;
      if (dx * dx + dy * dy < 26) continue;
      R(g, mx + x, my + y, 1, 1, x < -3 || y > 3 ? '#d6cba8' : '#f4ead0');
    }
  }
  // the far shore and its town, then the sea in bands with glints
  const sr = rng(5);
  for (let x = 0; x < w; x++) { const t = Math.round(HORIZON - 2 - Math.abs(Math.sin(x * 0.045)) * 3); R(g, x, t, 1, HORIZON - t, '#0a0e24'); }
  for (let i = 0; i < 18; i++) R(g, Math.floor(sr() * w), HORIZON - 1 - Math.floor(sr() * 2), 1, 1, sr() < 0.7 ? '#ffd27a' : '#ff9d5c');
  const sea = ['#13224f', '#0f1c44', '#0b1638', '#08112c'];
  for (let y = HORIZON; y < h; y++) R(g, 0, y, w, 1, sea[Math.min(3, Math.floor((y - HORIZON) / 12))]);
  for (let row = 0; HORIZON + 3 + row * 6 < h; row++) {
    const y = HORIZON + 3 + row * 6, step = 30 + row * 5;
    for (let x = (row * 13) % step - step; x < w; x += step) R(g, x, y, 4 + (row % 3) * 2, 1, row < 3 ? '#2a3f7a' : '#223566');
    R(g, mx - 3 + ((row * 5) % 7) - 3, y, 3 + (row % 2) * 3, 1, '#c9c0a2');           // the moon's path
  }
  // moored boats: one far off, one in each wing
  boat(g, X(62), 61, 0.55, true);
  boat(g, X(-24), 71, 1, true);
  boat(g, X(178), 69, 0.9, false);

  // the rock the tower stands on
  for (let x = X(94); x < X(156); x++) {
    const k = (x - X(125)) / 31, top = Math.round(78 + k * k * 14 + Math.sin(x * 0.7) * 1);
    R(g, x, top - 1, 1, 1, 'ink.0'); R(g, x, top, 1, h - top, ROCK.mid);
    R(g, x, top, 1, 1, ROCK.hi);
    if ((x * 3) % 7 === 0) R(g, x, top + 4 + (x % 5), 2, 1, ROCK.lo);
  }

  // the dock: planks over pilings
  const d0 = X(-6), d1 = X(104);
  for (let x = d0 + 4; x < d1; x += 12) { R(g, x - 1, DOCK + 4, 5, h - DOCK - 4, 'ink.0'); R(g, x, DOCK + 4, 3, h - DOCK - 4, PLANK.lo); R(g, x, DOCK + 4, 1, h - DOCK - 4, PLANK.mid); }
  R(g, d0, DOCK - 1, d1 - d0, 6, 'ink.0');
  R(g, d0, DOCK, d1 - d0, 4, PLANK.mid);
  R(g, d0, DOCK, d1 - d0, 1, PLANK.hi);
  R(g, d0, DOCK + 3, d1 - d0, 1, PLANK.lo);
  for (let x = d0 + 3; x < d1; x += 8) R(g, x, DOCK + 1, 1, 2, PLANK.lo);

  // the lamp posts (heads and signs are drawn live)
  for (const l of LAMPS) {
    const px = X(l.x);
    R(g, px - 2, 56, 5, DOCK - 56, 'ink.0'); R(g, px - 1, 56, 3, DOCK - 56, 'steel.2'); R(g, px - 1, 56, 1, DOCK - 56, 'steel.3');
    R(g, px - 1, 59, 12, 3, 'ink.0'); R(g, px, 60, 10, 1, 'steel.3');                         // the arm
    for (const cx of [px + 3, px + 8]) R(g, cx, 61, 1, 2, 'steel.1');                         // its chains
  }

  // the tower: red and white bands, shaded round; the door; its ladder
  const [t0, t1] = TOWER.map(X);
  for (let y = GALLERY + 2; y < 80; y++) {
    const band = Math.floor((y - GALLERY - 2) / 6) % 2 === 0;
    R(g, t0 - 1, y, t1 - t0 + 2, 1, 'ink.0');
    R(g, t0, y, t1 - t0, 1, band ? PAINT.red : PAINT.white);
    R(g, t1 - 5, y, 4, 1, band ? PAINT.redLo : PAINT.whiteLo);
    R(g, t0 + 2, y, 1, 1, band ? '#e05a5f' : '#fbf8f1');
  }
  R(g, t0 - 4, 78, t1 - t0 + 8, 4, 'ink.0'); R(g, t0 - 3, 78, t1 - t0 + 6, 3, STONE.mid); R(g, t0 - 3, 78, t1 - t0 + 6, 1, STONE.hi);
  R(g, t0 + 6, 68, 7, 10, 'ink.0'); R(g, t0 + 7, 69, 5, 9, '#1c2038'); R(g, t0 + 7, 69, 5, 1, '#ffd27a');
  const lx = X(LADDER);
  R(g, lx - 1, GALLERY, 3, DOCK - GALLERY, 'ink.0'); R(g, lx, GALLERY, 1, DOCK - GALLERY, 'steel.3');
  for (let y = GALLERY + 3; y < DOCK; y += 4) { R(g, lx - 3, y - 1, 5, 3, 'ink.0'); R(g, lx - 2, y, 3, 1, 'steel.4'); }

  // the gallery slab and the lantern's frame, roof and vent
  const g0 = X(102), g1 = X(138);
  R(g, g0 - 1, GALLERY - 1, g1 - g0 + 2, 4, 'ink.0'); R(g, g0, GALLERY, g1 - g0, 2, STONE.mid); R(g, g0, GALLERY, g1 - g0, 1, STONE.hi);
  for (const bx of [g0 + 2, g1 - 6]) for (let i = 0; i < 4; i++) R(g, bx + (bx < X(120) ? i : 0), GALLERY + 3 + i, 4 - i, 1, 'ink.0');
  const [bx, by] = [X(BEACON[0]), BEACON[1]];
  R(g, bx - 7, by - 7, 15, 14, 'ink.0');
  for (let i = 0; i <= 3; i++) R(g, bx - 7 + i * 5, by - 7, 1, 14, 'steel.3');
  for (let i = 0; i < 9; i++) {
    const hw = Math.round(9 * Math.sqrt(1 - (i / 9) * (i / 9)));
    R(g, bx - hw, by - 8 - i, hw * 2 + 1, 1, i === 0 ? 'ink.0' : i < 2 ? PAINT.redLo : PAINT.red);
  }
  R(g, bx - 2, by - 20, 5, 4, 'ink.0'); R(g, bx - 1, by - 19, 3, 2, 'steel.3'); R(g, bx, by - 24, 1, 4, 'ink.0');
  return c;
}

// the front rail of the gallery (he stands behind it)
function rail(ctx, X) {
  const g0 = X(102), g1 = X(138);
  R(ctx, g0, GALLERY - 7, g1 - g0, 2, 'ink.0'); R(ctx, g0, GALLERY - 7, g1 - g0, 1, 'steel.3');
  for (let x = g0; x <= g1; x += 6) R(ctx, x, GALLERY - 7, 1, 7, 'ink.0');
}

// a hanging sign: dark until its lamp is lit, then painted in its colour
const signs = new Map();
function signArt(glyph, ramp, lit) {
  const key = glyph + ramp + lit;
  if (signs.has(key)) return signs.get(key);
  const [c, g] = makeCanvas(14, 12);
  R(g, 0, 0, 14, 12, 'ink.0'); g.clearRect(0, 0, 1, 1); g.clearRect(13, 0, 1, 1); g.clearRect(0, 11, 1, 1); g.clearRect(13, 11, 1, 1);
  R(g, 1, 1, 12, 10, lit ? ramp + '.1' : '#262b40');
  R(g, 1, 1, 12, 1, lit ? ramp + '.2' : '#343a54');
  const map = GLYPH[glyph];
  const ox = 2, oy = 1 + Math.floor((10 - map.length) / 2);
  g.fillStyle = col(lit ? 'white.2' : 'slate.2');
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'x') g.fillRect(ox + i, oy + j, 1, 1); }));
  signs.set(key, c);
  return c;
}

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'contact',
  facts: [],
  split: [0, 0.7, 0.999],          // no walk in; the page ends in the hold
  key: 0.85,
  idle: true,

  build({ w, h }) {
    const x0 = coreX(w), X = (v) => x0 + v, c = Math.round(w / 2);
    const enter = [c - 4, 0];
    // the cables: from each post's foot under the dock to the tower, up its face to the lamp
    const cables = LAMPS.map((l, i) => {
      const px = X(l.x), cx = X(TOWER[0] + 10 + i * 2), uy = DOCK + 6 + i * 2;
      const pts = [[px, DOCK + 4], [px, uy], [cx, uy], [cx, GALLERY + 2]];
      return { pts, len: Math.abs(uy - DOCK - 4) + Math.abs(cx - px) + Math.abs(uy - GALLERY - 2), ramp: l.ramp };
    });
    // the dotted line along everything he does in the act
    const N = 120, line = [], len = [0];
    for (let i = 0; i <= N; i++) {
      const p = at(i / N, X, enter);
      line.push([p.x, p.y]);
      if (i) len.push(len[i - 1] + Math.hypot(p.x - line[i - 1][0], p.y - line[i - 1][1]));
    }
    return {
      back: paintBack(w, h, X), X, c, enter, cables, line, len,
      route: { enter, act: [X(STAND), GALLERY], exit: [c, h] },
    };
  },

  draw(ctx, f, b) {
    const { X } = b;
    ctx.drawImage(b.back, 0, 0);
    const done = f.phase === 'before' ? -1 : f.phase === 'act' ? f.act : 1;    // how far the act has got
    const tick = f.t ? Math.floor(f.t / 125) : 0;

    // the cables: light runs from each lamp to the lantern
    b.cables.forEach((cb, i) => {
      const k = f.reduced ? 1 : clamp((done - LIT_AT[i]) / (IGNITE[0] - LIT_AT[i]), 0, 1);
      cable(ctx, cb, k);
    });
    // the lamps and their signs
    LAMPS.forEach((l, i) => {
      const on = f.reduced || done >= LIT_AT[i], px = X(l.x);
      if (on) {
        ctx.fillStyle = 'rgba(255,224,138,0.07)'; ctx.beginPath(); ctx.arc(px + 0.5, 53, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,224,138,0.08)'; ctx.beginPath(); ctx.arc(px + 0.5, 53, 7, 0, Math.PI * 2); ctx.fill();
      }
      R(ctx, px - 3, 48, 7, 9, 'ink.0'); R(ctx, px - 4, 47, 9, 2, 'ink.0');
      R(ctx, px - 2, 49, 5, 7, on ? l.ramp + '.3' : 'slate.2');
      if (on) R(ctx, px - 1, 51, 3, 3, '#fbf8f1');
      ctx.drawImage(signArt(l.glyph, l.ramp, on), px + 1, 63);
    });

    // the beacon: dark, coming up, then lit with one beam sweeping (scroll)
    const glow = f.reduced ? 1 : f.phase === 'before' ? 0 : f.phase === 'act' ? ease.outCubic(clamp((f.act - IGNITE[0]) / (IGNITE[1] - IGNITE[0]), 0, 1)) : 1;
    const beam = f.reduced ? 1 : f.phase === 'act' ? clamp((f.act - IGNITE[1]) / (1 - IGNITE[1]), 0, 1) : f.phase === 'before' ? 0 : 1;
    const angle = f.reduced ? 0.8 * Math.PI : f.phase === 'hold' ? lerp(0.12, 0.88, f.hold) * Math.PI : f.phase === 'act' ? 0.12 * Math.PI : 0.88 * Math.PI;
    const flicker = tick && tick % 11 === 3 ? 0.8 : 1;
    beacon(ctx, X(BEACON[0]), BEACON[1], glow * flicker, beam, angle);

    // the path he took, cream behind him
    const k = clamp(done, 0, 1) * (b.line.length - 1), i = Math.floor(k);
    const pathDone = f.reduced || f.phase !== 'act' && f.phase !== 'before' ? Infinity : done < 0 ? -1 : b.len[i] + (i < b.len.length - 1 ? (b.len[i + 1] - b.len[i]) * (k - i) : 0);
    drawPath(ctx, b.line, { done: pathDone });

    f.drawHero();
    rail(ctx, X);
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    if (f.phase === 'hold') {
      // he waves from the gallery: a wave, a pause, a wave (idle clock)
      const t = f.t % 5000;
      const wave = f.reduced ? 1 : t < 1500 ? Math.floor(t / 250) % 2 : -1;
      return { pose: wave >= 0 ? 'wave' : t > 3600 && t < 3800 ? 'blink' : 'idle', frame: Math.max(0, wave), x: b.X(STAND), y: GALLERY, facing: -1 };
    }
    const p = at(f.act, b.X, b.enter, f.dir, f.still);
    return { pose: p.pose, frame: p.frame || 0, x: p.x, y: p.y, facing: p.facing };
  },
};

// a cable: dark, lit in its colour up to k of its length, a bright head
function cable(ctx, cb, k) {
  const { pts } = cb;
  let left = k * cb.len, head = null;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    const ax = Math.min(x0, x1), ay = Math.min(y0, y1), wd = Math.abs(x1 - x0) + 1, ht = Math.abs(y1 - y0) + 1;
    R(ctx, ax, ay, wd, ht, '#232838');
    if (left > 0) {
      const u = Math.min(1, left / L);
      const ex = lerp(x0, x1, u), ey = lerp(y0, y1, u);
      R(ctx, Math.min(x0, ex), Math.min(y0, ey), Math.abs(ex - x0) + 1, Math.abs(ey - y0) + 1, cb.ramp + '.2');
      if (u < 1) head = [ex, ey];
      left -= L;
    }
  }
  if (head && k > 0 && k < 1) { R(ctx, head[0] - 1, head[1] - 1, 3, 3, 'ink.0'); R(ctx, head[0], head[1], 1, 1, '#fbf8f1'); }
}

// the lamp: its lens, its halo and, once it's lit, one beam turning round.
// The beam is foreshortened as it turns (long across the harbour, short as
// it faces you), in flat stepped bands, and it never leaves the scene.
function beacon(ctx, x, y, glow, beam, angle) {
  const lens = glow > 0.5 ? '#fff3c4' : glow > 0 ? '#c2a35a' : '#1a2346';
  R(ctx, x - 6, y - 6, 12, 12, lens);
  for (let i = 1; i <= 2; i++) R(ctx, x - 7 + i * 5, y - 6, 1, 12, 'steel.3');
  if (glow <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const warm = (a) => `rgba(255,214,120,${(a * glow).toFixed(3)})`;
  for (const [r, a] of [[16, 0.06], [10, 0.08], [6, 0.12]]) { ctx.fillStyle = warm(a); ctx.beginPath(); ctx.arc(x + 0.5, y, r, 0, Math.PI * 2); ctx.fill(); }
  if (beam > 0) {
    const dx = Math.cos(angle), toward = Math.sin(angle);
    const len = 84 * Math.abs(dx) * beam;
    if (len > 6) {
      // three widths, each fading out in three steps along its length
      for (const [spread, a] of [[14, 0.06], [9, 0.07], [4, 0.1]]) {
        for (const [k0, k1, fall] of [[0, 0.5, 1], [0.5, 0.78, 0.6], [0.78, 1, 0.3]]) {
          const x0 = x + dx * len * k0, x1 = x + dx * len * k1, s0 = lerp(3, spread, k0), s1 = lerp(3, spread, k1);
          ctx.fillStyle = warm(a * fall * (1 + 0.6 * Math.max(0, toward)));
          ctx.beginPath(); ctx.moveTo(x0, y - s0); ctx.lineTo(x1, y - s1); ctx.lineTo(x1, y + s1); ctx.lineTo(x0, y + s0); ctx.fill();
        }
      }
    }
    const flash = Math.pow(Math.max(0, toward), 8);
    if (flash > 0.05) { ctx.fillStyle = warm(0.2 * flash); ctx.beginPath(); ctx.arc(x + 0.5, y, 8 + flash * 8, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  R(ctx, x - 2, y - 3, 5, 6, '#ffffff');
}

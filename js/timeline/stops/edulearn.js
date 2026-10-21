// EduLearn Hackathon (online · Oct 2024): 1st of 700+. The event was
// online, so the scene is the giant laptop from the game: its keyboard
// deck is the floor, its screen a video call with exactly as many webcam
// tiles as the card's "700+" (one of them is him), and a results window.
// He climbs the 2-1-3 podium on the deck to 1st, the results flip from
// "Final results" to "1st Place" (HTML labels), his tile lights gold, and
// the tiles applaud: a sweep of raised hands and floating hearts (hearts
// only). While he holds, a few tiles light up as people talk (≤ 8 fps).
//
// transit (T7, down to the trading bot): two feed rails, cyan (Level II
// order flow) and gold (microstructure). As he nears each one its bad
// ticks blink out and it slides into time alignment, the two forming the
// steps he walks down, and dotted shared-timestamp lines appear between
// them. It's all a function of how far along he is, so scrolling back up
// un-aligns them.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 8 and §2 T7.
// Contract: docs/BUILDING-STOPS.md. Art copied from js/themes/dhs.js.

import { drawPath, routeDone, routePoints, sky, fadeEdges, pathLength } from '../kit.js';
import { col } from '../../art/palette.js';
import { makeCanvas, ease, clamp, lerp, rng } from '../../engine/util.js';

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const glyph = (ctx, g, x, y, c) => { ctx.fillStyle = c; g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'x') ctx.fillRect(x + i, y + j, 1, 1); }); };

const DECK = 84;                 // the keyboard deck he stands on
const K = {
  ink: col('ink.0'), lid: col('#2a2d36'), lidHi: col('#4a4f5e'), lidLo: col('#1b1d24'),
  screen: col('#11152c'), bar: col('#1f2550'), win: col('#070914'), winEdge: col('#2a3366'),
  deck: col('#9aa0ad'), deckHi: col('#c9ced8'), key: col('#5d626d'), deckLo: col('#7d818b'), desk: col('#241b20'), deskHi: col('#3a2b2c'),
  live: col('red.2'), dot: col('white.2'), gold: col('gold.3'), heart: col('red.3'), talk: col('green.2'),
};

// the call's people (from the game's gallery), a little muted so 700 of
// them read as a crowd: a face pixel over a shirt, on a dark tile
const SKINS = ['#5a321f', '#7c4729', '#a0653d', '#c0845a', '#e0b08a'].map(col);
const SHIRTS = ['teal.1', 'gold.1', 'magenta.1', 'cyan.1', 'red.1', 'slate.3', 'indigo.3', 'green.1', 'orange.1', 'white.0', 'teal.2', 'steel.3'].map(col);
const TILEBG = ['#2a3366', '#323a6e', '#273058', '#33355a', '#2b3f5c', '#352f50'].map(col);
const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];

// the podium, 2-1-3; small pixel numerals are part of the picture
const DIGIT = { 1: ['.x.', 'xx.', '.x.', '.x.', 'xxx'], 2: ['xx.', '..x', '.x.', 'x..', 'xxx'], 3: ['xx.', '..x', '.x.', '..x', 'xx.'] };
const MEDAL = { 1: ['gold.2', 'gold.3', '#c27a18'], 2: ['white.0', 'white.2', '#8a93a8'], 3: ['orange.1', 'orange.3', '#9b5a2a'] };
const STEPS = [{ n: 2, dx: -28, w: 18, hgt: 11 }, { n: 1, dx: -10, w: 20, hgt: 16 }, { n: 3, dx: 10, w: 18, hgt: 8 }];
const FIRST = DECK - 16;

const COLS = 35, PX = 4, PY = 3;                 // the gallery grid: 3×2 tiles on a 4×3 pitch
const WIN = { c0: 10, c1: 24, r0: 1, r1: 6 };    // the results window, kept clear of tiles
const ME = { c: 17, r: 7 };                      // his tile, just under the results

// the beat, as fractions of the act phase
const RESULT = 0.22;                              // "Final results" → "1st Place"
const CLAP = [0.24, 0.84];                        // the applause sweeps the call
const JUMP = [0.3, 0.52];                         // he jumps for joy on 1st

function backdrop(b, w, h, c, g) {
  sky(b, w, h, ['#10142e', '#151a38']);
  rect(b, 0, 93, w, h - 93, K.desk);
  rect(b, 0, 93, w, 1, K.deskHi);
  // the lid and its screen
  const lx = c - 76, lw = 152;
  rect(b, lx - 1, 2, lw + 2, DECK - 1, K.ink);
  rect(b, lx, 3, lw, DECK - 3, K.lid);
  rect(b, lx, 3, lw, 1, K.lidHi); rect(b, lx, 3, 1, DECK - 3, K.lidHi);
  rect(b, lx + lw - 2, 3, 2, DECK - 3, K.lidLo);
  rect(b, c - 1, 4, 2, 1, K.lidHi);                            // the webcam
  const sx = c - 73, sw = 146;
  rect(b, sx, 6, sw, 75, K.screen);
  rect(b, sx, 6, sw, 6, K.bar);
  [['red.2', 0], ['gold.2', 4], ['green.2', 8]].forEach(([cc, i]) => rect(b, sx + 2 + i, 8, 2, 2, col(cc)));
  rect(b, sx + sw - 14, 7, 12, 4, K.live);                     // the red "live" badge: a dot, no words
  rect(b, sx + sw - 12, 8, 2, 2, K.dot);
  rect(b, sx + sw - 8, 8, 4, 1, col('red.3')); rect(b, sx + sw - 8, 9, 3, 1, col('red.3'));
  // the tiles
  for (const t of g.tiles) {
    rect(b, t.x, t.y, 3, 2, t.bg);
    rect(b, t.x + 1, t.y, 1, 1, t.skin);
    rect(b, t.x, t.y + 1, 3, 1, t.shirt);
  }
  // the results window
  const [wx, wy, ww, wh] = g.win;
  rect(b, wx - 1, wy - 1, ww + 2, wh + 2, K.winEdge);
  rect(b, wx, wy, ww, wh, K.win);
  rect(b, wx, wy, ww, 3, K.bar);
  [['red.2', 0], ['gold.2', 3], ['green.2', 6]].forEach(([cc, i]) => rect(b, wx + 2 + i, wy + 1, 1, 1, col(cc)));
  // the hinge, then the keyboard deck: the floor of the scene
  rect(b, lx, DECK - 3, lw, 3, K.lidLo);
  rect(b, c - 83, DECK - 1, 166, 10, K.ink);
  rect(b, c - 82, DECK, 164, 1, K.deckHi);
  rect(b, c - 82, DECK + 1, 164, 6, K.deck);
  for (let r = 0; r < 2; r++) for (let x = c - 78 + r * 3; x < c + 76; x += 6) rect(b, x, DECK + 2 + r * 3, 4, 2, K.key);
  rect(b, c - 82, DECK + 7, 164, 1, K.deckLo);
  rect(b, c - 82, DECK + 8, 164, 1, K.key);
  // the podium on the deck
  for (const s of STEPS) {
    const x = c + s.dx, top = DECK - s.hgt, [band, hi, num] = MEDAL[s.n];
    rect(b, x - 1, top - 1, s.w + 2, s.hgt + 1, K.ink);
    rect(b, x, top, s.w, s.hgt, col('#d9dce6'));
    rect(b, x + s.w - 2, top + 3, 2, s.hgt - 3, col('#aeb3c2'));
    rect(b, x, top, s.w, 3, col(band)); rect(b, x, top, s.w, 1, col(hi));
    glyph(b, DIGIT[s.n], x + Math.floor(s.w / 2) - 1, top + 4, col(num));
  }
}

// the gallery: exactly n tiles on the grid, skipping the results window
function gallery(n, c) {
  const gx = c - 70, gy = 13, r = rng(700), tiles = [];
  let me = null;
  for (let row = 0; tiles.length < n; row++) {
    for (let q = 0; q < COLS && tiles.length < n; q++) {
      if (q >= WIN.c0 && q < WIN.c1 && row >= WIN.r0 && row < WIN.r1) continue;
      const t = { x: gx + q * PX, y: gy + row * PY, skin: SKINS[Math.floor(r() * SKINS.length)], shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], bg: TILEBG[Math.floor(r() * TILEBG.length)], ph: Math.floor(r() * 97) };
      if (q === ME.c && row === ME.r) { t.skin = col('skin.1'); t.shirt = col('shirt.0'); me = t; }
      tiles.push(t);
    }
  }
  const win = [gx + WIN.c0 * PX, gy + WIN.r0 * PY, (WIN.c1 - WIN.c0) * PX - 1, (WIN.r1 - WIN.r0) * PY - 1];
  return { tiles, me, win, gx, gy };
}

// ─── T7: two feeds, cleaned and time-aligned into steps ───────────────

const kindOf = (dx, dy) => (Math.abs(dy) > 2 * Math.abs(dx) ? 'drop' : dy > 0.6 * Math.abs(dx) ? 'slide' : 'walk');
function legsOf(pts) {
  const legs = [];
  let d = 0, heading = 1;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.5) heading = dx > 0 ? 1 : -1;
    legs.push({ x0, y0, x1, y1, dx, dy, len, d, heading, kind: kindOf(dx, dy) });
    d += len;
  }
  return legs;
}
function legAt(legs, d) {
  for (let i = 0; i < legs.length; i++) if (d <= legs[i].d + legs[i].len || i === legs.length - 1) return i;
  return legs.length - 1;
}

const FEED = {
  l2: { top: col('cyan.3'), tick: col('cyan.2') },          // Level II order flow
  micro: { top: col('gold.3'), tick: col('gold.2') },       // microstructure
  body: col('indigo.1'), under: col('indigo.0'), bad: col('red.2'), stamp: col('white.0'),
};
const CROSS = ['x.x', '.x.', 'x.x'];
const blink = (k) => k <= 0 || (k < 1 && Math.floor(k * 6) % 2 === 0);

function rail(ctx, x0, x1, y, feed) {
  const x = Math.round(Math.min(x0, x1)), w = Math.round(Math.abs(x1 - x0));
  rect(ctx, x - 1, y - 1, w + 2, 6, K.ink);
  rect(ctx, x, y, w, 4, FEED.body);
  rect(ctx, x, y, w, 1, feed.top);
  rect(ctx, x, y + 3, w, 1, FEED.under);
}

const T7 = {
  build({ w, h, from = [Math.round(w / 2), 0], to = [Math.round(w / 2), h], side = 0 }) {
    const fd = side ? -side : -1, c = w / 2, fx = from[0], tx = to[0];
    const RL = Math.min(36, Math.round(w / 2 - 6)), GAP = 32;
    // the formed steps: rail 1 from just past the centre out toward the free side,
    // rail 2 a step lower and further out
    const a1 = Math.round(c - fd * 6), b1 = a1 + fd * RL, a2 = a1 + fd * 8, b2 = b1 + fd * 8;
    let y1 = Math.round((h - GAP) / 2), y2 = y1 + GAP;
    if (y1 < 20 || h - y2 < 16) { y1 = Math.round(h * 0.3); y2 = Math.round(h * 0.68); }
    const land2 = b1 + fd * 2;
    const pts = [from, [fx, y1], [b1, y1], [land2, y2], [a2, y2], to];
    const legs = legsOf(pts), len = pathLength(pts);
    const d1 = legs[1].d, d2 = legs[3].d, run1 = legs[1].len, run2 = legs[3].len;
    // event times along the shared stretch, plus each feed's own, plus bad ticks
    const r = rng(2024);
    const lo = Math.min(b1, a2) + 2, hi = Math.max(b1, a2) - 2;
    const shared = [];
    for (let x = lo; x <= hi; x += 4 + Math.floor(r() * 3)) shared.push(Math.round(x));
    const own1 = [a1 + fd * 3, a1 + fd * 6], own2 = [b2 - fd * 3, b2 - fd * 6];
    const bad1 = [shared[1] + 2, shared[shared.length - 2] - 2].map(Math.round), bad2 = [shared[2] - 2, b2 - fd * 4].map(Math.round);
    const m1 = Math.min(d1, 40);
    return {
      pts, legs, len, y1, y2, a1, b1, a2, b2, fd,
      ticks1: [...shared, ...own1], ticks2: [...shared, ...own2], shared, bad1, bad2,
      // where along his path each piece happens (distances, so it all follows him)
      win: {
        bad1: [d1 - 0.85 * m1, d1 - 0.5 * m1], align1: [d1 - 0.55 * m1, d1 - 2],
        bad2: [d1 - 0.2 * m1, d1 + run1 * 0.4], align2: [d1 + run1 * 0.2, d2 - 3],
        dots: [d2 - 10, d2 + run2 * 0.5],
      },
      off1: -fd * 7, off2: fd * 8,                                   // how far out of time each feed starts
    };
  },

  draw(ctx, g, b) {
    const d = clamp(g.s, 0, 1) * b.len;
    const k = (name) => { if (g.reduced) return 1; const [a, z] = b.win[name]; return clamp((d - a) / Math.max(1, z - a), 0, 1); };
    const kb1 = k('bad1'), ka1 = ease.inOutCubic(k('align1')), kb2 = k('bad2'), ka2 = ease.inOutCubic(k('align2')), kd = k('dots');
    const o1 = Math.round(b.off1 * (1 - ka1)), o2 = Math.round(b.off2 * (1 - ka2));
    // the spine's dots on the drops; on the rails, the rails are the path
    for (const L of b.legs) if (L.kind === 'drop') drawPath(ctx, [[L.x0, L.y0 - 1], [L.x1, L.y1 - 1]], { done: g.reduced ? Infinity : d - L.d, start: L.d });
    // the shared timestamps, dotted down from feed 1 to feed 2 once both are aligned
    if (kd > 0) {
      const top = b.y1 + 6, bottom = b.y2 - 2, end = top + Math.round((bottom - top) * kd);
      ctx.fillStyle = FEED.stamp;
      for (const x of b.shared) for (let y = top; y < end; y += 2) ctx.fillRect(x, y, 1, 1);
    }
    // the rails, each with its ticks hanging below and its bad ticks marked ✕
    const feedRail = (a, z, y, off, ticks, bad, kb, feed) => {
      rail(ctx, a + off, z + off, y, feed);
      ctx.fillStyle = feed.tick;
      for (const x of ticks) ctx.fillRect(x + off, y + 5, 1, 2);
      if (blink(kb)) for (const x of bad) glyph(ctx, CROSS, x + off - 1, y + 5, FEED.bad);
    };
    feedRail(b.a1, b.b1, b.y1, o1, b.ticks1, b.bad1, kb1, FEED.l2);
    feedRail(b.a2, b.b2, b.y2, o2, b.ticks2, b.bad2, kb2, FEED.micro);
  },

  hero(g, b) {
    const d = clamp(g.s, 0, 1) * b.len;
    const i = legAt(b.legs, d), L = b.legs[i];
    const u = L.len > 0 ? clamp((d - L.d) / L.len, 0, 1) : 1;
    const facing = L.heading * g.dir;
    if (L.kind === 'drop') {
      const up = L.dy < 0, e = up ? 1 - (1 - u) * (1 - u) : u * u;
      const rising = (g.dir > 0) === up;
      return { x: L.x0 + L.dx * u, y: L.y0 + L.dy * e, pose: rising || u < 0.12 ? 'jump' : 'fall', frame: 0, facing };
    }
    const x = lerp(L.x0, L.x1, u), y = lerp(L.y0, L.y1, u);
    const prev = b.legs[i - 1];
    if (prev && prev.kind === 'drop' && d - L.d < 3) return { x, y, pose: 'crouch', frame: 0, facing };
    return { x, y, pose: g.still ? 'idle' : 'run', frame: Math.floor(d / 5) % 4, facing };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'edulearn',
  facts: ['a-edulearn'],
  split: [0.22, 0.58, 0.85],     // a longer walk in: the climb up the podium is his
  idle: true,

  build({ w, h, el }) {
    const c = Math.round(w / 2);
    // as many tiles as the card says took part ("700+"), never more
    const m = el && /(\d[\d,]*)\+/.exec(el.textContent);
    const n = m ? parseInt(m[1].replace(/,/g, ''), 10) : 700;
    const g = gallery(n, c);
    const [back, b] = makeCanvas(w, h);
    backdrop(b, w, h, c, g);
    // hearts float up from tiles around the call once he's won
    const r = rng(77);
    const hearts = Array.from({ length: 12 }, (_, i) => {
      const t = g.tiles[Math.floor(r() * g.tiles.length)];
      return { x: t.x - 1, y: t.y, a: CLAP[0] + 0.06 + i * 0.045, life: 0.16 };
    });
    return {
      back, c, n, hearts, ...g,
      route: {
        enter: [c, 0],
        via: [[c - 38, DECK], [c - 26, DECK], [c - 26, DECK - 11], [c - 10, DECK - 11], [c - 10, FIRST]],
        act: [c, FIRST], leave: [[c + 8, FIRST]], exit: [c + 8, h],
      },
    };
  },

  draw(ctx, f, b) {
    ctx.drawImage(b.back, 0, 0);
    const won = f.phase === 'after' || f.phase === 'hold' || f.phase === 'out' || (f.phase === 'act' && f.act >= RESULT);
    // the applause: a sweep of raised hands (gold either side of each face)
    if (f.phase === 'act' && f.act > CLAP[0] && f.act < CLAP[1]) {
      const u = (f.act - CLAP[0]) / (CLAP[1] - CLAP[0]);
      const front = b.gx - 8 + u * (COLS * PX + 16);
      ctx.fillStyle = K.gold;
      for (const t of b.tiles) if (Math.abs(t.x + 1 - front) < 5) { ctx.fillRect(t.x, t.y, 1, 1); ctx.fillRect(t.x + 2, t.y, 1, 1); }
    }
    // while he holds: someone is always talking
    if (f.t > 0) {
      const beat = Math.floor(f.t / 250);
      ctx.fillStyle = K.talk;
      for (const t of b.tiles) if ((beat + t.ph) % 61 === 0) ctx.fillRect(t.x, t.y + 2, 3, 1);
    }
    // his tile, rimmed in gold once the results are in
    if (won) {
      const t = b.me;
      ctx.fillStyle = K.gold;
      ctx.fillRect(t.x - 1, t.y - 1, 5, 1); ctx.fillRect(t.x - 1, t.y + 2, 5, 1);
      ctx.fillRect(t.x - 1, t.y, 1, 2); ctx.fillRect(t.x + 3, t.y, 1, 2);
    }
    // hearts, the only reaction
    if (f.phase === 'act') for (const hrt of b.hearts) {
      const u = (f.act - hrt.a) / hrt.life;
      if (u <= 0 || u >= 1 || (u > 0.75 && Math.floor(u * 12) % 2)) continue;
      const y = Math.round(hrt.y - 3 - u * 12);
      const [wx, wy, ww, wh] = b.win;
      if (y < 13 || (hrt.x + 5 > wx && hrt.x < wx + ww && y + 5 > wy && y < wy + wh + 1)) continue;
      glyph(ctx, HEART, hrt.x, y, K.heart);
    }
    // the spine picks up on the deck: he drops in front of the screen, not along a dotted line over it
    const pts = routePoints(b.route), skip = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    drawPath(ctx, pts.slice(1), { done: routeDone(b.route, f) - skip, start: skip });
    f.drawHero();
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    const [x, y] = b.route.act;
    if (f.phase === 'act' && f.act < JUMP[0]) return { pose: 'idle', frame: 0, x, y, facing: 1 };
    const u = f.phase === 'act' ? clamp((f.act - JUMP[0]) / (JUMP[1] - JUMP[0]), 0, 1) : 1;
    return { pose: 'victory', frame: 0, x, y: y - Math.round(Math.sin(Math.PI * u) * 10), facing: 1 };
  },

  labels(f, b) {
    const won = f.phase === 'after' || f.phase === 'hold' || f.phase === 'out' || (f.phase === 'act' && f.act >= RESULT);
    const [wx, wy, ww] = b.win;
    return [won ? { text: '1st Place', x: wx + ww / 2, y: wy + 4, tone: 'gold' } : { text: 'Final results', x: wx + ww / 2, y: wy + 4, tone: 'cyan' }];
  },

  transit: T7,
};

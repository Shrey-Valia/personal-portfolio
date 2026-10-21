// Northeastern University (Boston, MA · expected May 2029). A snowy brick
// campus at dusk: one hardback textbook per course in the card's
// [data-credit] list floats in an arch over the sidewalk, and he catches
// them one at a time, left to right, into a stack in his arms. The book
// in flight names its course in an HTML label. A streetcar waits at left,
// the lecture hall stands at right, and the snow that started as he
// dropped through the cloud floor keeps falling (with the scroll).
//
// transit (T5, down to Dublin High): he slides down a dusk golden
// Tri-Valley hillside past valley-oak silhouettes, kicking up a dust
// trail, and lands on a concrete walkway under a red canopy.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 5 and §2 T5.
// Contract: docs/BUILDING-STOPS.md. Art copied from js/themes/neu.js.

import { drawPath, routeDone, routePoints, sky, fadeEdges, ledge, coreX, FLOOR, pathLength } from '../kit.js';
import { col } from '../../art/palette.js';
import { line, disc } from '../../art/draw.js';
import { makeCanvas, ease, clamp, lerp, rng } from '../../engine/util.js';

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

const K = {
  snow: col('#eef3fa'), snow2: col('#dde6f2'), snowLo: col('#aebcd4'), bank: col('#8e9dbb'), bankHi: col('#b4c1da'),
  pave: col('#a54a39'), pave2: col('#8a3a2d'), mortar: col('#5e2a24'), curb: col('#8e939e'), curbLo: col('#5d626d'),
  street: col('#221d26'), slush: col('#3a3540'), hole: col('#0b0a12'), step: col('#2c2630'),
  lit: col('#ffd27a'), lit2: col('#ffb85c'), iron: col('#24262f'), ironHi: col('#454956'), ink: col('ink.0'),
  stone: col('#9e978c'), stoneHi: col('#b2ab9e'), stoneLo: col('#857e74'), stoneSh: col('#77706a'), wood: col('#4a2c1c'),
  cream: col('#f5f1e6'), gold: col('#ffe08a'), goldBand: col('gold.2'), skin: col('skin.2'),
};

// ─── textbooks: one per course (glyphs from the game's lecture hall) ──

const GLYPHS = [
  [/object|oop/i, ['.xx.xx.', '.x...x.', 'x.....x', '.x...x.', '.xx.xx.']],      // { }
  [/data struct|algorithm/i, ['...x...', '..x.x..', '.x...x.', 'x.x.x.x', '.......']], // a tree
  [/discrete/i, ['x.....x', '.x...x.', '.xxxxx.', '..x.x..', '...x...']],          // ∀
  [/engineer|cornerstone/i, ['..x.x..', '.xxxxx.', 'xxx.xxx', '.xxxxx.', '..x.x..']], // a gear
  [/calc/i, ['....xx.', '...x...', '...x...', '...x...', '.xx....']],              // ∫
  [/physic/i, ['..xxx..', '.x.x.x.', 'x.xxx.x', '.x.x.x.', '..xxx..']],            // an atom
  [/chem/i, ['..xxx..', '...x...', '..x.x..', '.x...x.', 'xxxxxxx']],              // a flask
];
const PAGE_GLYPH = ['xxxxx..', '.......', 'xxxx...', '.......', 'xxxxx..'];
const glyphFor = (name) => (GLYPHS.find(([re]) => re.test(name)) || [null, PAGE_GLYPH])[1];
const COVERS = ['red', 'indigo', 'green', 'gold', 'teal', 'magenta', 'orange', 'cyan'];

function glyph(ctx, g, x, y, c) {
  ctx.fillStyle = c;
  g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'x') ctx.fillRect(x + i, y + j, 1, 1); });
}

const BW = 13, BH = 7;          // a floating hardback, spine toward you
const SW = 12, SH = 3;          // the same book lying in his stack

// a hardback seen spine-on: cover colour, gold bands, the course glyph
function hardback(ctx, x, y, cover, g, lit) {
  x = Math.round(x); y = Math.round(y);
  rect(ctx, x - 1, y - 1, BW + 2, BH + 2, K.ink);
  rect(ctx, x, y, BW, BH, col(cover + '.2'));
  rect(ctx, x, y, BW, 1, col(cover + '.3'));
  rect(ctx, x, y + BH - 1, BW, 1, col(cover + '.1'));
  rect(ctx, x + 1, y + 1, 1, BH - 2, K.goldBand); rect(ctx, x + BW - 2, y + 1, 1, BH - 2, K.goldBand);
  glyph(ctx, g, x + 3, y + 1, lit ? K.gold : K.cream);
}

// the same book squashed toward a slab as it lands in the stack (k 0 → 1)
function flyingBook(ctx, x, y, k, cover, g) {
  if (k < 0.5) { hardback(ctx, x, y, cover, g, true); return; }
  slab(ctx, x + 1, y + 2, SW, cover);
}

function slab(ctx, x, y, w, cover) {
  x = Math.round(x); y = Math.round(y);
  rect(ctx, x - 1, y - 1, w + 2, SH + 2, K.ink);
  rect(ctx, x, y, w, SH, col(cover + '.2'));
  rect(ctx, x, y, w, 1, col(cover + '.3'));
  rect(ctx, x + 3, y + 1, w - 6, 1, K.goldBand);          // the title, gold now it's earned
}

// ─── the backdrop, drawn once per width ───────────────────────────────

function backdrop(b, w, h, cx, ex) {
  sky(b, w, 80, ['#141a36', '#1f2750', '#323d6c', '#4f5584', '#7a7097']);

  // far skyline, and a brick clock tower over the campus
  const r = rng(8);
  for (let x = -6; x < w;) {
    const bw = 9 + Math.floor(r() * 16), top = 46 + Math.floor(r() * 12);
    rect(b, x, top, bw, 80 - top, col('#2c3260'));
    rect(b, x, top, bw, 1, col('#3a4170'));
    for (let wy = top + 3; wy < 74; wy += 3) for (let wx = x + 2; wx < x + bw - 1; wx += 3) if (r() < 0.1) rect(b, wx, wy, 1, 1, col('#c9b77e'));
    x += bw + Math.floor(r() * 5);
  }
  const tx = cx + 54;
  rect(b, tx - 4, 34, 9, 46, col('#2a2c52'));
  rect(b, tx - 5, 33, 11, 2, col('#3a3f68'));
  for (let i = 0; i < 6; i++) rect(b, tx - 4 + i * 0.75, 27 + i, 9 - i * 1.5, 1, col('#2a2c52'));
  rect(b, tx, 24, 1, 3, col('#2a2c52'));
  rect(b, tx - 2, 37, 5, 5, col('#e8d9a8'));
  rect(b, tx, 38, 1, 2, K.ink); rect(b, tx, 39, 2, 1, K.ink);

  // brick rowhouses with lit windows and snow on every ledge
  const q = rng(29);
  for (let x = -4; x < w;) {
    const bw = 20 + Math.floor(q() * 16), top = 54 + Math.floor(q() * 8);
    const tone = q() < 0.5 ? ['#5e3330', '#4b2a28'] : ['#55332f', '#43292a'];
    rect(b, x, top, bw, 80 - top, col(tone[0]));
    rect(b, x + bw - 3, top, 3, 80 - top, col(tone[1]));
    rect(b, x - 1, top, bw + 2, 2, col('#7d7770'));
    rect(b, x - 1, top - 1, bw + 2, 1, col('#dfe6f2'));
    for (let wy = top + 5; wy < 74; wy += 7) for (let wx = x + 3; wx < x + bw - 5; wx += 6) {
      rect(b, wx, wy, 3, 4, q() < 0.55 ? col('#f2c36a') : col('#2b2e45'));
      rect(b, wx - 1, wy + 4, 5, 1, col('#c9d3e6'));
    }
    x += bw + 1;
  }

  // the far snowbank, then the brick sidewalk under its skin of snow
  rect(b, 0, 76, w, 6, K.bank);
  for (let x = 0; x < w; x++) rect(b, x, 75 + (Math.sin(x / 3.1) > 0.3 ? 1 : 0), 1, 1, K.bankHi);
  rect(b, 0, FLOOR, w, 2, K.snow2);
  rect(b, 0, FLOOR, w, 1, K.snow);
  rect(b, 0, FLOOR + 2, w, 1, K.snowLo);
  rect(b, 0, FLOOR + 3, w, 5, K.pave);
  for (let row = 0; row < 2; row++) {
    rect(b, 0, FLOOR + 5 + row * 3, w, 1, K.mortar);
    for (let x = (row ? 4 : 0); x < w; x += 8) rect(b, x, FLOOR + 3 + row * 3, 1, 2, K.mortar);
  }
  rect(b, 0, FLOOR + 8, w, 1, K.curb); rect(b, 0, FLOOR + 9, w, 1, K.curbLo);
  rect(b, 0, FLOOR + 10, w, h - FLOOR - 10, K.street);
  const s = rng(17);
  for (let i = 0; i < w / 3; i++) rect(b, Math.floor(s() * w), FLOOR + 11 + Math.floor(s() * 6), 2, 1, K.slush);

  streetcar(b, cx - 34);
  facade(b, cx + 134, w);
  stairwell(b, ex);

  // iron lamp posts in the wings
  for (const x of [cx - 14, cx + 176]) {
    rect(b, x, 54, 2, 28, K.iron);
    rect(b, x - 2, 50, 6, 4, K.iron); rect(b, x - 1, 51, 4, 2, col('#ffe3a0'));
    rect(b, x - 2, 49, 6, 1, K.snow);
  }
}

// the green streetcar stopped at left (copied from the game, made static)
function streetcar(b, x) {
  const w = 58, roof = 52;
  rect(b, x - 8, 41, w + 30, 1, col('#1d1e2e'));                    // the overhead wire
  line(b, x + 22, roof, x + 27, roof - 6, '#1d1e2e'); line(b, x + 27, roof - 6, x + 23, roof - 11, '#1d1e2e');
  line(b, x + 32, roof, x + 27, roof - 6, '#1d1e2e');
  rect(b, x - 1, roof - 1, w + 2, 37, K.ink);
  rect(b, x, roof, w, 5, col('#a9aeb8'));
  rect(b, x, roof, w, 2, K.snow2);
  rect(b, x, roof + 5, w, 11, col('#262a3a'));
  for (let i = 0; i < 5; i++) {
    const wx = x + 3 + i * 11;
    rect(b, wx, roof + 7, 8, 8, K.lit);
    rect(b, wx, roof + 12, 8, 3, K.lit2);
    rect(b, wx, roof + 7, 2, 1, col('#fff3cf'));
  }
  rect(b, x, roof + 16, w, 14, col('#2f7a4a'));
  rect(b, x, roof + 16, w, 1, col('#4f9a66'));
  rect(b, x, roof + 18, w, 2, col('#cfc9bd'));
  rect(b, x + w - 18, roof + 21, 10, 9, col('#246039'));             // doors
  rect(b, x + w - 13, roof + 21, 1, 9, K.ink);
  rect(b, x + w - 3, roof + 22, 2, 3, col('#fff3cf'));              // headlamp
  rect(b, x, roof + 30, w, 4, col('#3b3f4c'));
  for (const bx of [x + 6, x + w - 22]) {
    rect(b, bx, roof + 34, 14, 4, col('#1d1e2e'));
    disc(b, bx + 3, roof + 37, 2, '#45495a'); disc(b, bx + 10, roof + 37, 2, '#45495a');
  }
  rect(b, x - 12, FLOOR + 10, w + 30, 1, K.curbLo);                 // rails
}

// the lecture hall, limestone in the dusk light, its doors at the foot
function facade(b, x, w) {
  const top = 42, g = FLOOR;
  rect(b, x - 1, top - 2, w - x + 2, g - top + 2, K.ink);
  rect(b, x, top, w - x, g - top, K.stone);
  rect(b, x, top - 2, w - x, 2, K.snow2);
  rect(b, x, top, w - x, 3, K.stoneLo);
  rect(b, x, top + 3, w - x, 5, K.stoneHi);
  rect(b, x, top + 8, w - x, 1, K.stoneLo);
  for (let i = 0; x + i < w; i += 18) {
    rect(b, x + 3 + i, top + 11, 5, g - top - 17, K.stoneHi);         // a column
    rect(b, x + 7 + i, top + 11, 1, g - top - 17, K.stoneSh);
    rect(b, x + 2 + i, top + 9, 7, 2, K.stoneLo);
  }
  // the doors in the first bay, tall lit windows in the rest
  rect(b, x + 10, 62, 9, 14, K.wood); rect(b, x + 14, 62, 1, 14, K.ink);
  rect(b, x + 10, 58, 9, 3, K.lit);
  for (let i = 18; x + i + 10 < w; i += 18) {
    rect(b, x + i + 11, 54, 5, 18, col('#5a4632'));
    rect(b, x + i + 12, 55, 3, 16, K.lit);
    rect(b, x + i + 12, 63, 3, 1, col('#5a4632'));
  }
  for (let i = 0; i < 3; i++) { rect(b, x - 2 + i, g - 6 + i * 2, w - x, 2, K.stoneLo); rect(b, x - 2 + i, g - 6 + i * 2, w - x, 1, K.stoneHi); }
}

// a subway stair down through the sidewalk: the way out of the scene
function stairwell(b, ex) {
  const x0 = ex - 6, x1 = ex + 6;
  rect(b, x0, FLOOR, x1 - x0, 100 - FLOOR, K.hole);
  for (let k = 0; k < 6; k++) rect(b, x0 + k * 2, FLOOR + 4 + k * 3, 4, 1, K.step);
  rect(b, x0 - 1, FLOOR, 1, 100 - FLOOR, K.ink); rect(b, x1, FLOOR, 1, 100 - FLOOR, K.ink);
  for (const px of [x0 - 3, x1 + 2]) {
    rect(b, px, FLOOR - 8, 1, 8, K.iron);
    rect(b, px - 1, FLOOR - 9, 3, 1, K.ironHi);
    rect(b, px - 1, FLOOR - 10, 3, 1, K.snow);
  }
  rect(b, x0 - 3, FLOOR - 5, 3, 1, K.iron); rect(b, x1, FLOOR - 5, 3, 1, K.iron);
}

// ─── snow (a function of the scroll, so it falls as you scroll) ───────

function flakes(seed, n, w, h) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, s: 0.6 + r() * 0.7, ph: r() * 6.28, big: r() < 0.22 }));
}
function drawSnow(ctx, list, p, w, h, size, c) {
  ctx.fillStyle = c;
  for (const fl of list) {
    const y = ((fl.y + p * 150 * fl.s) % (h + 6)) - 3;
    const x = (((fl.x + Math.sin(p * 9 + fl.ph) * 2.5) % w) + w) % w;
    const k = fl.big ? size : 1;
    ctx.fillRect(Math.round(x), Math.round(y), k, k);
  }
}

// ─── where he is, so the stack follows his hands ──────────────────────

// in act and hold he stands on his mark; walking out, the engine walks
// him along [act, leave, exit] exactly like this (walk right, then drop)
function heroAt(f, b) {
  if (!f.here || f.phase === 'in') return null;
  const [ax, ay] = b.route.act;
  if (f.phase !== 'out') return { x: ax, y: ay, facing: 1 };
  const lx = b.route.leave[0][0], L1 = Math.abs(lx - ax), L2 = b.h - ay;
  const d = f.walk * (L1 + L2), facing = (lx > ax ? 1 : -1) * f.dir;
  if (d <= L1) return { x: ax + Math.sign(lx - ax) * d, y: ay, facing };
  const u = (d - L1) / L2;
  return { x: lx, y: ay + L2 * u * u, facing };
}

// how far book k has flown into his stack: 0 floating, 1 caught
function caught(f, bk) {
  if (f.phase === 'before' || f.phase === 'in') return 0;
  if (f.phase === 'act') return clamp((f.act - bk.a) / bk.d, 0, 1);
  return 1;
}

// the stack in his arms: book k's slab, from his feet (x, y)
function slabAt(x, y, facing, k, bk) {
  const cx = x + 11 * facing + bk.jx;
  return [Math.round(cx - bk.sw / 2), Math.round(y - 9 - SH * (k + 1))];
}

// ─── T5: down a golden hillside to Dublin ─────────────────────────────

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

// a slope's cross-section, top down: lit gold grass, then dusk soil stepping into the page
const HILL = {
  rows: ['gold.2', '#d08c34', '#b27530', '#8f5c2e', '#8f5c2e', '#6e4a34', '#6e4a34', '#563c38', '#4a3440', '#3a2c44', '#2c2444', '#211f40'].map(col),
  tuft: col('#ffd27a'),
};
const OAK = { leaf: col('#2b3622'), hi: col('#3f4b2c'), trunk: col('#241a14') };

// a valley oak: a short trunk under a broad, flat-bottomed crown
function oak(a, x, y) {
  rect(a, x - 1, y - 5, 2, 5, OAK.trunk);
  const rows = [[-13, 6], [-12, 10], [-11, 12], [-10, 12], [-9, 12], [-8, 10], [-7, 6]];
  for (const [dy, w] of rows) rect(a, x - w / 2, y + dy, w, 1, OAK.leaf);
  rect(a, x - 4, y - 12, 4, 1, OAK.hi); rect(a, x - 5, y - 11, 3, 1, OAK.hi);
}
const DUST = ['#ecd09a', '#dcb57a', '#c99d66', '#b08656', '#94704a', '#7a5e42'].map(col);

const T5 = {
  build({ w, h, from = [Math.round(w / 2), 0], to = [Math.round(w / 2), h], side = 0, lane = 0 }) {
    const fd = side ? -side : -1;                                   // the free side, away from the card
    const fx = from[0], tx = to[0];
    const xFree = Math.round(w / 2 + fd * Math.min(w / 2 - 10, 32));
    const xCard = Math.round(w / 2 - fd * Math.min(side ? Math.max(4, lane - 8) : w / 2 - 12, 14));
    const crest = Math.min(8, Math.max(2, Math.round(h * 0.08)));
    const yW = h - 12;                                              // the walkway under the canopy
    const ROOF = 31;                                                // canopy height over the walkway
    // he slides to the foot of the hill, drops beside the canopy, walks under it
    const foot = Math.max(crest + 6, yW - (h >= 80 ? ROOF + 2 : 6));
    // switchback slides, an odd number so the last one ends on the free side
    const H = foot - crest, span = Math.abs(xFree - xCard), first = Math.abs(fx - xFree) || span;
    let n = 1;
    while (H / (first + (n - 1) * span) > 1.7 && n < 41) n += 2;
    const slope = H / (first + (n - 1) * span);
    const pts = [from, [fx, crest]];
    let x = fx, y = crest;
    for (let i = 0; i < n; i++) {
      const nx = i % 2 === 0 ? xFree : xCard;
      y = i === n - 1 ? foot : Math.round(y + Math.abs(nx - x) * slope);
      x = nx;
      pts.push([x, y]);
    }
    if (yW > foot) pts.push([x, yW]);
    pts.push([tx, yW], to);
    const legs = legsOf(pts);
    const len = pathLength(pts);

    const [art, a] = makeCanvas(w, h);
    const r = rng(41);
    // gold grass along each slope over its dusk soil
    for (const L of legs) {
      if (L.kind !== 'slide') continue;
      const xa = Math.min(L.x0, L.x1), xb = Math.max(L.x0, L.x1);
      for (let cx = xa; cx <= xb; cx++) {
        const yy = Math.round(L.y0 + ((cx - L.x0) / L.dx) * L.dy);
        HILL.rows.forEach((c, j) => rect(a, cx, yy + 1 + j, 1, 1, c));
        if ((cx + yy) % 5 === 0) rect(a, cx, yy, 1, 1, HILL.tuft);
      }
    }
    // valley oaks standing on the slopes; he slides past in front of them
    for (const L of legs) {
      if (L.kind !== 'slide' || L.len < 24) continue;
      for (const u of [0.3 + r() * 0.12, 0.7 + r() * 0.12]) {
        const ox = Math.round(L.x0 + L.dx * u), oy = Math.round(L.y0 + L.dy * u);
        if (ox < 8 || ox > w - 8) continue;
        oak(a, ox, oy + 1);
      }
    }
    // the walkway and its red canopy (Dublin's hardware), clear of the slope's foot
    const dirW = tx >= x ? 1 : -1;
    const wx0 = Math.min(x - dirW * 6, tx + dirW * 8), wx1 = Math.max(x - dirW * 6, tx + dirW * 8);
    ledge(a, wx0, yW + 1, wx1 - wx0, 'concrete');
    const roof = yW - ROOF;
    if (h >= 80) {
      const c0 = Math.min(x + dirW * 7, tx + dirW * 10), c1 = Math.max(x + dirW * 7, tx + dirW * 10);
      for (const px of [c0 + 1, c1 - 3]) { rect(a, px, roof + 6, 2, yW - roof - 5, col('#7c8a92')); rect(a, px + 1, roof + 6, 1, yW - roof - 5, col('#55616a')); }
      rect(a, c0 - 1, roof - 1, c1 - c0 + 2, 8, K.ink);
      rect(a, c0, roof, c1 - c0, 1, col('#e0574f'));
      rect(a, c0, roof + 1, c1 - c0, 3, col('#b8323a'));
      for (let i = c0 + 1; i < c1; i += 4) rect(a, i, roof + 1, 1, 3, col('#7e1f28'));
      rect(a, c0, roof + 4, c1 - c0, 2, col('#7e1f28'));
    }
    return { art, pts, dots: pts.map(([px, py]) => [px, py - 1]), legs, len };
  },

  draw(ctx, g, b) {
    ctx.drawImage(b.art, 0, 0);
    drawPath(ctx, b.dots, { done: g.reduced ? Infinity : g.s * b.len });
    if (g.reduced || g.here === false || g.s <= 0 || g.s >= 1) return;
    // a dust trail kicked up behind him while he slides, settling as it trails off
    const d = g.s * b.len;
    for (let j = 1; j <= 6; j++) {
      const dj = d - 8 - j * 4;
      if (dj <= 0) break;
      const L = b.legs[legAt(b.legs, dj)];
      if (L.kind !== 'slide') continue;
      const u = clamp((dj - L.d) / L.len, 0, 1);
      const x = Math.round(L.x0 + L.dx * u), y = Math.round(L.y0 + L.dy * u);
      const k = j < 3 ? 2 : 1, rise = Math.round(4 - j * 0.5);
      ctx.fillStyle = DUST[j - 1];
      ctx.fillRect(x - (j % 2), y - rise - k, k, k);
      if (j < 4) ctx.fillRect(x + 2 - (j % 2) * 4, y - rise + 1, 1, 1);
    }
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
    if (prev && prev.kind !== 'walk' && L.kind === 'walk' && d - L.d < 3) return { x, y, pose: 'crouch', frame: 0, facing };
    if (L.kind === 'slide') return { x, y, pose: 'slide', frame: 0, facing };
    return { x, y, pose: g.still ? 'idle' : 'run', frame: Math.floor(d / 5) % 4, facing };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'neu',
  facts: ['e-neu', 'e-neu-courses'],

  build({ w, h, el }) {
    const cx = coreX(w), c = Math.round(w / 2), ex = c + 8;
    const names = el ? [...el.querySelectorAll('[data-credit]')].map((n) => n.textContent.trim()).filter(Boolean) : [];
    const list = names.length ? names : ['Relevant coursework'];
    const [back, b] = makeCanvas(w, h);
    backdrop(b, w, h, cx, ex);

    // the books float in an arch over the sidewalk, highest in the middle
    const n = list.length, mid = (n - 1) / 2;
    const pitch = n > 1 ? Math.min(19, 120 / (n - 1)) : 0;
    const flight = Math.min(0.1, 0.8 / n), step = n > 1 ? (0.92 - flight - 0.05) / (n - 1) : 0;
    const r = rng(n * 31 + 7);
    const books = list.map((name, i) => {
      const t = mid ? (i - mid) / mid : 0;
      return {
        name, glyph: glyphFor(name), cover: COVERS[i % COVERS.length],
        x: Math.round(c + (i - mid) * pitch - BW / 2), y: 15 + Math.round(t * t * 10),
        a: 0.05 + i * step, d: flight,
        sw: SW - (i % 3 === 1 ? 1 : 0), jx: Math.round((r() - 0.5) * 2),
      };
    });
    return {
      back, books, c,
      far: flakes(3, Math.round(w * 0.16), w, h), near: flakes(5, Math.round(w * 0.05), w, h),
      route: { enter: [c, 0], act: [c - 6, FLOOR], leave: [[ex, FLOOR]], exit: [ex, h] },
    };
  },

  draw(ctx, f, b) {
    ctx.drawImage(b.back, 0, 0);
    drawPath(ctx, routePoints(b.route), { done: routeDone(b.route, f) });
    if (!f.reduced) drawSnow(ctx, b.far, f.p, f.w, f.h, 1, col('#c9d3e6'));
    const ks = b.books.map((bk) => caught(f, bk));
    b.books.forEach((bk, i) => { if (ks[i] <= 0) hardback(ctx, bk.x, bk.y, bk.cover, bk.glyph, false); });
    // the books he's caught, stacked in his arms (behind his hands)
    const me = heroAt(f, b);
    if (me) b.books.forEach((bk, i) => { if (ks[i] >= 1) { const [sx, sy] = slabAt(me.x, me.y, me.facing, i, bk); slab(ctx, sx, sy, bk.sw, bk.cover); } });
    f.drawHero();
    // books in flight, in front of him
    if (me) b.books.forEach((bk, i) => {
      const k = ks[i];
      if (k <= 0 || k >= 1) return;
      const e = ease.inOutCubic(k);
      const [sx, sy] = slabAt(me.x, me.y, me.facing, i, bk);
      const x = lerp(bk.x, sx - 1, e), y = lerp(bk.y, sy - 2, e) - Math.sin(Math.PI * e) * 8;
      flyingBook(ctx, x, y, e, bk.cover, bk.glyph);
    });
    if (!f.reduced) drawSnow(ctx, b.near, f.p * 1.3, f.w, f.h, 2, col('#eef3fa'));
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    const holding = f.phase !== 'act' || f.act >= b.books[0].a;
    return { pose: holding ? 'carry' : 'idle', frame: 0, x: b.route.act[0], y: b.route.act[1], facing: 1 };
  },

  // the course in flight (or the last one caught), then the card's own heading
  labels(f, b) {
    if (f.phase === 'hold') return [{ text: 'Relevant coursework', x: b.c, y: 2, tone: 'gold' }];
    if (f.phase !== 'act') return [];
    let k = -1;
    b.books.forEach((bk, i) => { if (f.act >= bk.a) k = i; });
    return k < 0 ? [] : [{ text: b.books[k].name, x: b.c, y: 2 }];
  },

  transit: T5,
};

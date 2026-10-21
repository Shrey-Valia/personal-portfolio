// Handshake AI (Jan–May 2026), AI Training Specialist. Generated images
// ride the line out of the model; he stamps each one's tag against the
// rubric (Flag: six fingers, "Helo wrold", a blue cube for a red one).
// His annotations go up to the board, "Fine-tuned on my annotations"
// lights, and the model regenerates them: each image dissolves into
// static and resolves fixed, its tag turned to Pass.
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 4. Contract: docs/BUILDING-STOPS.md.
//
// Art ported from js/themes/handshake.js (paintHand, paintSign, paintCube,
// bake, nhash/noiseCol, factorySky, the deck and the belt), with every
// per-tick field turned into a function of f.act. The move below it
// (transit) is the remapped T3: a steel chute with orange trim, three
// image cards riding down beside him (the tree card's tag flips from a
// car to a tree with a check as he passes), then a drop through the
// cloud floor into the San Francisco dusk.

import { sky, fadeEdges, drawPath, routeDone, routePoints, handAt, FLOOR, pathLength } from '../kit.js';
import { col } from '../../art/palette.js';
import { compileMap } from '../../art/sprite.js';
import { stripedSky, disc } from '../../art/draw.js';
import { makeCanvas, ease, rng, clamp, lerp } from '../../engine/util.js';

const C = (r) => col(r);
const INK = '#0b0d17';
const span = (a, t0, t1) => clamp((a - t0) / (t1 - t0), 0, 1);

// ─── layout (game px; x relative to the centre cx) ───────────────────

const D = 36;                         // card pitch on the belt
const IW = 26, IH = 18;               // a generated image
const CW = IW + 4, CH = IH + 4;       // its card: ink edge, a 1 px rim, the image
const BELT = 56;                      // the belt's top surface (cards stand on it)
const CARD_Y = BELT - CH;             // card top
const TAG_Y = BELT + 12;              // tags hang under the belt, at his chest
const PANEL = [12, 25];               // the fine-tune board, top and bottom
const HATCH = 6;                      // the exit (the chute mouth), right of centre

// the act, as fractions of f.act
const STEP = 0.16, MOVE = 0.10;                     // three belt steps, each a move then a stamp
const NOTES = [0.5, 0.58], NOTE_GAP = 0.02;         // annotations fly up to the board
const LIT = 0.62;                                   // the board lights
const CABLE = [0.62, 0.68];                         // the fine-tune reaches the model
const REGEN = 0.68, REGEN_LEN = 0.2, REGEN_GAP = 0.05;

// ─── the generated images (paintHand, paintSign, paintCube) ─────────

// digits = upright fingers + the thumb: 5 when fixed, 6 when broken
function paintHand(ctx, w, h, digits) {
  stripedSky(ctx, w, h, ['#b3a9dc', '#968cc6']);
  const skin = C('skin.3'), shade = C('skin.2'), line = C('skin.0');
  const n = digits - 1, pitch = 3, fw = 2, wide = n * pitch - 1;
  const px0 = Math.round(w / 2 - wide / 2) + 2, palmTop = 9, palmH = 5;
  const tall = n === 4 ? [6, 8, 8, 6] : [6, 8, 8, 8, 6];
  // the thumb, out to the left and up from the heel of the palm
  const thumb = [[-4, 7], [-4, 8], [-3, 9], [-3, 10], [-2, 11], [-2, 12]];
  // silhouette first, then fills, so every digit keeps a dark gap
  ctx.fillStyle = line;
  ctx.fillRect(px0 - 1, palmTop - 1, wide + 2, palmH + 2);
  ctx.fillRect(px0, palmTop + palmH, wide, h - palmTop - palmH);
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch - 1, palmTop - tall[i] - 1, fw + 2, tall[i] + 2);
  for (const [dx, y] of thumb) ctx.fillRect(px0 + dx - 1, y - 1, 4, 3);
  ctx.fillStyle = skin;
  ctx.fillRect(px0, palmTop, wide, palmH);
  ctx.fillRect(px0 + 1, palmTop + palmH, wide - 2, h - palmTop - palmH);
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch, palmTop - tall[i], fw, tall[i] + 1);
  for (const [dx, y] of thumb) ctx.fillRect(px0 + dx, y, 2, 1);
  ctx.fillStyle = shade; ctx.fillRect(px0, palmTop + palmH - 1, wide, 1); ctx.fillRect(px0 + 1, palmTop + palmH, 1, h - palmTop - palmH);
  ctx.fillStyle = C('white.1');
  for (let i = 0; i < n; i++) ctx.fillRect(px0 + i * pitch, palmTop - tall[i], 1, 1);
}

// 5-row pixel glyphs for the sign: part of the picture, not text
const GLYPH = {
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  e: ['...', '.#.', '###', '#..', '.##'],
  l: ['#', '#', '#', '#', '#'],
  o: ['...', '.#.', '#.#', '#.#', '.#.'],
  w: ['.....', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  r: ['...', '#.#', '##.', '#..', '#..'],
  d: ['..#', '..#', '.##', '#.#', '.##'],
};
const wordWidth = (s) => [...s].reduce((n, ch) => n + GLYPH[ch][0].length + 1, -1);
function glyphs(ctx, s, cx, y, color) {
  let x = Math.round(cx - wordWidth(s) / 2);
  ctx.fillStyle = color;
  for (const ch of s) {
    const g = GLYPH[ch];
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); });
    x += g[0].length + 1;
  }
}

function paintSign(ctx, w, h, fixed) {
  stripedSky(ctx, w, h, ['#5ea6d2', '#9fd3ee']);
  ctx.fillStyle = C('grass.2'); ctx.fillRect(0, h - 3, w, 3);
  ctx.fillStyle = C('grass.3'); ctx.fillRect(0, h - 3, w, 1);
  ctx.fillStyle = C('wood.0'); ctx.fillRect(w / 2 - 1, 14, 2, h - 16);
  ctx.fillStyle = INK; ctx.fillRect(1, 0, w - 2, 15);
  ctx.fillStyle = C('wood.3'); ctx.fillRect(2, 1, w - 4, 13);
  ctx.fillStyle = C('wood.2'); ctx.fillRect(2, 13, w - 4, 1);
  const [a, b] = fixed ? ['Hello', 'world'] : ['Helo', 'wrold'];
  glyphs(ctx, a, w / 2, 2, C('wood.0'));
  glyphs(ctx, b, w / 2, 8, C('wood.0'));
}

function paintCube(ctx, w, h, ramp) {
  stripedSky(ctx, w, h, ['#c3c9d6', '#9ea6b8']);
  ctx.fillStyle = C('#7c8498'); ctx.fillRect(w / 2 - 9, h - 3, 18, 1);
  const cx = Math.round(w / 2), cy = 9, s = 7;
  for (let j = 0; j <= s; j++) {                 // top face: a diamond
    const half = Math.round(j <= s / 2 ? j * 2 : (s - j) * 2);
    ctx.fillStyle = C(ramp + '.3'); ctx.fillRect(cx - half, cy - s / 2 + j - 2, half * 2, 1);
  }
  for (let j = 0; j < s + 1; j++) {              // left and right faces
    const y = cy - 1 + j;
    for (let i = 0; i < s; i++) {
      const dy = Math.round(i / 2);
      ctx.fillStyle = C(ramp + '.2'); ctx.fillRect(cx - s + i, y + dy, 1, 1);
      ctx.fillStyle = C(ramp + '.1'); ctx.fillRect(cx + s - 1 - i, y + dy, 1, 1);
    }
  }
}

const ART = [
  (ctx, fixed) => paintSign(ctx, IW, IH, fixed),
  (ctx, fixed) => paintHand(ctx, IW, IH, fixed ? 5 : 6),
  (ctx, fixed) => paintCube(ctx, IW, IH, fixed ? 'red' : 'indigo'),
];

// ─── static: the diffusion noise between the broken and the fixed image ──

const NOISE = ['#2b2f3d', '#4c5368', '#6f7890', '#9aa3b8', '#c3cad8', '#e9edf4', '#3cc0e8', '#f07a1f'];
const nhash = (i, f) => {
  let v = Math.imul(i + 1, 2654435761) ^ Math.imul(f + 7, 40503);
  v = Math.imul(v ^ (v >>> 15), 2246822519);
  return (v ^ (v >>> 13)) >>> 0;
};
// greys mostly, the odd coloured fleck
const noiseCol = (i, f) => { const h = nhash(i, f); return NOISE[(h & 15) < 14 ? (h >>> 4) % 6 : 6 + ((h >>> 4) & 1)]; };
const rgbOf = (hex) => { const n = parseInt(C(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const NOISE_RGB = NOISE.map(rgbOf);
const noiseRGB = (i, f) => NOISE_RGB[NOISE.indexOf(noiseCol(i, f))];

// a canvas's pixels, kept as RGBA (bake, but as bytes for putImageData)
function bake(c) {
  return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
}

// ─── small icons (pixel art, never text) ──────────────────────────────

const ICON = {
  flag: ['###.', '####', '###.', '#...', '#...'],
  check: ['....#', '...##', '#.##.', '###..', '.#...'],
  note: ['#####', '#...#', '#.#.#', '#...#', '#####'],
};
function icon(ctx, rows, x, y, color) {
  ctx.fillStyle = C(color);
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); });
}

// ─── the backdrop: factorySky at night over the deck ─────────────────

function puff(ctx, cx, cy, r, lit, shade) {
  disc(ctx, cx, cy + 2, r, shade);
  disc(ctx, cx, cy, r, lit);
}

function backdrop(b, w, h, cx) {
  sky(b, w, h, ['#121a44', '#19224e', '#212b5b', '#2a3466']);
  const r = rng(17);
  // faint high streaks, the theme's cirrus at night
  b.fillStyle = 'rgba(160,176,220,0.10)';
  for (let i = 0; i < 5; i++) {
    const x = Math.round(r() * w), y = Math.round(16 + r() * 22), ww = Math.round(18 + r() * 30);
    b.fillRect(x, y, ww, 1); b.fillRect(x + 6, y + 2, Math.round(ww * 0.6), 1);
  }
  // the moon, in a wing when there is one
  if (w >= 200) { disc(b, w - 28, 30, 5, '#a9b2c8'); disc(b, w - 27, 29, 4, '#c3cad8'); }
  // floating factory islands, far off: sawtooth halls, a chimney, lit windows
  const ri = rng(23);
  for (let x = 4 + Math.floor(ri() * 10); x < w - 30; x += 70 + Math.floor(ri() * 40)) {
    const iw = 38 + Math.floor(ri() * 18), base = 62 + Math.floor(ri() * 6);
    for (let k = 0; k <= iw; k += 7) puff(b, x + k, base + 4, 4 + Math.floor(ri() * 3), '#2e3866', '#252d58');
    const bh = 7 + Math.floor(ri() * 5), top = base - bh;
    b.fillStyle = C('#222a54'); b.fillRect(x + 4, top, iw - 8, bh + 3);
    for (let s = 0; s + 8 <= iw - 8; s += 8) for (let j = 0; j < 8; j++) {
      const t = Math.floor(j / 2);
      b.fillRect(x + 4 + s + j, top - t, 1, t);
    }
    for (let wx = x + 7; wx < x + iw - 7; wx += 5) { b.fillStyle = ri() < 0.45 ? C('#a8682a') : C('#2f3a6e'); b.fillRect(wx, top + 3, 2, 2); }
    const chx = x + 8 + Math.floor(ri() * (iw - 20));
    b.fillStyle = C('#1b2248'); b.fillRect(chx, top - 10, 3, 10);
    b.fillStyle = C('orange.1'); b.fillRect(chx, top - 8, 3, 1);
  }
  // the moonlit cloud sea the plant floats on
  const rc = rng(31);
  for (let i = 0; i < Math.ceil(w / 14) + 1; i++) puff(b, i * 14 + rc() * 8, 74 + rc() * 3, 6 + Math.floor(rc() * 4), '#3a4473', '#2e3762');
  b.fillStyle = C('#2e3762'); b.fillRect(0, 79, w, FLOOR - 79);

  // the deck: night-lit plate over the orange-and-white edge stripe, a girder, the truss
  const y = FLOOR, hx0 = cx + HATCH - 6, hx1 = cx + HATCH + 6;
  const run = (x0, x1) => {
    const ww = x1 - x0;
    b.fillStyle = INK; b.fillRect(x0, y - 1, ww, 1);
    b.fillStyle = C('white.0'); b.fillRect(x0, y, ww, 1);
    b.fillStyle = C('steel.4'); b.fillRect(x0, y + 1, ww, 3);
    b.fillStyle = C('steel.3'); b.fillRect(x0, y + 4, ww, 1);
    for (let i = x0; i < x1; i++) for (let k = 0; k < 2; k++) {
      b.fillStyle = ((i + k) >> 2) & 1 ? C('orange.2') : C('white.0');
      b.fillRect(i, y + 5 + k, 1, 1);
    }
    b.fillStyle = C('#3c4560'); b.fillRect(x0, y + 7, ww, 1);
    b.fillStyle = C('steel.2'); b.fillRect(x0, y + 8, ww, 3);
    b.fillStyle = C('steel.1'); for (let i = x0 + 2; i < x1; i += 6) b.fillRect(i, y + 9, 1, 1);
    b.fillStyle = C('#161b2e'); b.fillRect(x0, y + 11, ww, h - y - 11);
    b.fillStyle = C('#232a42');
    for (let i = x0; i < x1; i++) for (let j = y + 11; j < h; j++) if ((((i + j) % 12) + 12) % 12 === 0 || (((i - j) % 12) + 12) % 12 === 0) b.fillRect(i, j, 1, 1);
  };
  run(0, hx0); run(hx1, w);
  // the chute mouth: orange trim round a dark shaft
  b.fillStyle = C('#080a14'); b.fillRect(hx0, y, hx1 - hx0, h - y);
  b.fillStyle = INK; b.fillRect(hx0 - 1, y - 1, 2, h - y + 1); b.fillRect(hx1 - 1, y - 1, 2, h - y + 1);
  b.fillStyle = C('orange.2'); b.fillRect(hx0 - 2, y - 1, 2, 4); b.fillRect(hx1, y - 1, 2, 4);
  b.fillStyle = C('orange.3'); b.fillRect(hx0 - 2, y - 1, 2, 1); b.fillRect(hx1, y - 1, 2, 1);
}

// the line: legs, the belt's frame and rollers (the moving chevrons are drawn live)
function beltFrame(b, x0, x1) {
  const y = BELT;
  for (const px of [x0 + 26, Math.round((x0 + x1) / 2) + 6, x1 - 5]) {
    b.fillStyle = INK; b.fillRect(px - 1, y + 4, 4, FLOOR - y - 4);
    b.fillStyle = C('steel.2'); b.fillRect(px, y + 4, 2, FLOOR - y - 4);
    b.fillStyle = C('steel.3'); b.fillRect(px, y + 4, 1, FLOOR - y - 4);
    b.fillStyle = INK; b.fillRect(px - 2, FLOOR - 2, 6, 2);
  }
  b.fillStyle = INK; b.fillRect(x0, y - 1, x1 - x0, 6);
  b.fillStyle = C('steel.4'); b.fillRect(x0, y, x1 - x0, 1);
  b.fillStyle = C('#2b3040'); b.fillRect(x0, y + 1, x1 - x0, 2);
  b.fillStyle = C('orange.2'); b.fillRect(x0, y + 3, x1 - x0, 1);
  disc(b, x1 - 1, y + 2, 3, INK); disc(b, x1 - 1, y + 2, 2, 'steel.3');
}

// the model: a housing the images come out of, with a hatch at belt height
function housing(ctx, x0, x1, lit) {
  const top = 28, hatchTop = CARD_Y - 3;
  ctx.fillStyle = INK; ctx.fillRect(x0, top - 1, x1 - x0 + 1, FLOOR - top + 1);
  ctx.fillStyle = C('steel.2'); ctx.fillRect(x0, top, x1 - x0, FLOOR - top);
  ctx.fillStyle = C('steel.3'); ctx.fillRect(x0, top, x1 - x0, 2);
  ctx.fillStyle = C('steel.1'); for (let y = top + 5; y < hatchTop - 2; y += 3) ctx.fillRect(x0 + 3, y, x1 - x0 - 8, 1);
  ctx.fillStyle = C('orange.2'); ctx.fillRect(x0, top + 2, x1 - x0, 1);
  // the hatch the cards ride out of
  ctx.fillStyle = INK; ctx.fillRect(x1 - 2, hatchTop, 3, BELT - hatchTop + 4);
  ctx.fillStyle = C('steel.4'); ctx.fillRect(x1 - 1, hatchTop, 1, BELT - hatchTop + 4);
  // a lamp: dim until the fine-tune reaches it
  ctx.fillStyle = INK; ctx.fillRect(x1 - 9, top + 6, 5, 5);
  ctx.fillStyle = lit ? C('cyan.3') : C('cyan.0'); ctx.fillRect(x1 - 8, top + 7, 3, 3);
  if (lit) { ctx.fillStyle = 'rgba(60,192,232,0.22)'; ctx.fillRect(x1 - 11, top + 4, 9, 9); }
}

// ─── the move to Droid (T3): the chute, the cards, the cloud floor ───

// the audit's image cards (PICS and drawCard from the theme)
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
};
let picCache = null;
const pic = (name) => {
  if (!picCache) picCache = {};
  return picCache[name] || (picCache[name] = compileMap(PICS[name].map, PICS[name].legend, 'hs-pic:' + name));
};
// a 16×12 card: white border, picture inset
function drawCard(ctx, x, y, name) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, 18, 14);
  ctx.fillStyle = C('white.2'); ctx.fillRect(x, y, 16, 12);
  ctx.fillStyle = C('white.0'); ctx.fillRect(x, y + 11, 16, 1);
  ctx.drawImage(pic(name), x + 2, y + 2);
}
const TAG_ICON = {
  car: ['..###..', '.#####.', '#######', '.#...#.'],
  tree: ['.###.', '#####', '#####', '..#..', '..#..'],
  tick: ['...#', '..#.', '#.#.', '.#..'],
};
// [picture, wrong tag or null]: two already pass; the tree is tagged "car"
const RIDERS = [['cat', null], ['tree', 'car'], ['fish', null]];

// the polyline he follows: down the chute, off its lip, down to Droid
function chuteGeometry(w, h, from, to, side, lane) {
  const free = side ? -side : -1;                          // the side the card isn't on
  const reach = side ? Math.min(38, Math.round(w / 2) - 8) : Math.max(10, Math.round(w / 2) - 14);
  const [fx] = from;
  const c0 = [fx, 0], c1 = [fx + free * reach, Math.round(h * 0.48)];
  return { free, side, lane, chute: [c0, c1], drop: [c1, to] };
}

// the point d px along a polyline, and the leg it's on
function along(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L || i === pts.length - 1) { const k = L ? clamp(d / L, 0, 1) : 1; return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), dx: x1 - x0 }; }
    d -= L;
  }
  return { x: pts[0][0], y: pts[0][1], dx: 0 };
}

const SLIDE = 0.6;                    // the chute takes this much of the move; the drop the rest
const UNDER = [13, 3];                // the cards' rail is slung this far under the chute
const RIDE = 0.3;                     // the cards slide at this fraction of his speed
const START = [0.15, 0.4, 0.65];      // where the cards are along the chute when he sets off
const STOPS = [0.38, 0.54, 0.7];      // and where their rail's buffers stop them

function chuteArt(w, h, geo) {
  const [c, b] = makeCanvas(w, h);
  // the cloud floor (a one-off silhouette, low contrast) and the San Francisco dusk under it
  const top = Math.round(h * 0.72), bot = Math.round(h * 0.84);
  // the "2025" year marker (page HTML, under this layer) sits left of the lane on
  // desktop, near the bottom: the dusk starts right of it, so it stays readable
  const dx0 = geo.side ? Math.max(0, Math.round(w / 2) - geo.lane - 2) : 0;
  for (let y = bot; y < h; y++) {
    const k = (y - bot) / Math.max(1, h - bot - 1);
    b.fillStyle = C(['#151a44', '#1a1a46', '#1c1944', '#17173f', '#111538', '#0e1433'][Math.min(5, Math.floor(k * 6))]);
    b.fillRect(dx0, y, w - dx0, 1);
    if (dx0) { b.fillStyle = C('#121741'); b.fillRect(dx0 - 3, y, 3, 1); }
  }
  const r = rng(11);
  for (let x = dx0; x < w;) {
    const bw = 5 + Math.floor(r() * 9), bh = 4 + Math.floor(r() * 9);
    b.fillStyle = C('#121535'); b.fillRect(x, h - bh - 3, bw, bh + 3);
    if (r() < 0.6) { b.fillStyle = C('#4a3a4e'); b.fillRect(x + 1 + Math.floor(r() * (bw - 2)), h - bh, 1, 1); }
    x += bw + 1 + Math.floor(r() * 4);
  }
  const rc = rng(29);
  // puffs taper off at both ends, so the floor never shows a cut edge
  const end = (x) => Math.min(1, Math.max(0, Math.min(x - 2, w - 2 - x) / 14));
  b.fillStyle = C('#161c47'); b.fillRect(10, top + 5, w - 20, bot - top - 5);
  for (let i = 0; i < Math.ceil(w / 9) + 2; i++) {
    const x = i * 9 + rc() * 5 - 4, y = top + 3 + rc() * 3, rr = Math.round((4 + Math.floor(rc() * 3)) * end(x));
    if (rr < 2) continue;
    disc(b, x, y + 2, rr, '#161c47'); disc(b, x, y, rr, '#1d2453');
  }
  for (let i = 0; i < Math.ceil(w / 11) + 2; i++) { const x = i * 11 + rc() * 6 - 3, rr = Math.round((3 + Math.floor(rc() * 2)) * end(x)); if (rr >= 2) disc(b, x, bot - 1 + rc() * 2, rr, '#141a44'); }

  // the chute: a row at a time, orange trim where he sits, the steel body under it
  const [[x0, y0], [x1, y1]] = geo.chute;
  const under = x1 < x0 ? 1 : -1;
  const rows = [];
  for (let y = y0; y <= y1; y++) rows.push([Math.round(lerp(x0, x1, (y - y0) / (y1 - y0))), y]);
  // the cards' rail, slung under it on hangers
  const [ox, oy] = UNDER;
  for (const [x, y] of rows) {
    if (y % 12 === 6) { b.fillStyle = C('steel.1'); for (let k = 0; k < ox; k++) b.fillRect(x + under * (6 + k), y + Math.round((oy * k) / ox), 1, 1); }
    b.fillStyle = INK; b.fillRect(x + under * ox - 1, y + oy - 1, 3, 2);
  }
  for (const [x, y] of rows) { b.fillStyle = C('steel.3'); b.fillRect(x + under * ox, y + oy, 1, 1); }
  for (const [x, y] of rows) {
    const a = under > 0 ? x - 1 : x - 6;
    b.fillStyle = INK; b.fillRect(a, y, 8, 1);
    for (let k = 0; k < 6; k++) {
      const d = under > 0 ? k : 5 - k;                      // 0 at the trim, 5 at the far edge
      b.fillStyle = d < 2 ? C(d ? 'orange.1' : 'orange.2') : C(d === 2 ? 'steel.4' : 'steel.2');
      b.fillRect(a + 1 + k, y, 1, 1);
    }
    if (y % 6 === 0) { b.fillStyle = C('steel.1'); b.fillRect(x + under * 4, y, 1, 1); }
  }
  // the lip it launches him off
  b.fillStyle = INK; b.fillRect(x1 - 4, y1, 9, 3);
  b.fillStyle = C('orange.2'); b.fillRect(x1 - 3, y1, 7, 1);
  b.fillStyle = C('steel.3'); b.fillRect(x1 - 3, y1 + 1, 7, 1);
  return { art: c, rail: geo.chute.map(([x, y]) => [x + under * ox, y + oy]) };
}

const transit = {
  build({ w, h, from, to, side = 0, lane }) {
    if (lane == null) lane = side ? 20 : 0;                  // the bench doesn't pass it
    const geo = chuteGeometry(w, h, from, to, side, lane);
    const { art, rail } = chuteArt(w, h, geo);
    const Lc = pathLength(geo.chute), Ld = pathLength(geo.drop);
    return { art, rail, geo, Lc, Ld, pts: [...geo.chute, to] };
  },

  draw(ctx, g, b) {
    ctx.drawImage(b.art, 0, 0);
    const s = g.reduced ? 1 : g.s;
    const uh = clamp(s / SLIDE, 0, 1) * b.Lc;
    const done = g.reduced ? Infinity : uh + clamp((s - SLIDE) / (1 - SLIDE), 0, 1) * b.Ld;
    drawPath(ctx, b.pts, { done });
    // the cards ride the rail down, slower than him; he overtakes each one
    RIDERS.forEach(([name, wrong], i) => {
      const u0 = START[i] * b.Lc;
      const u = g.reduced ? u0 : Math.min(u0 + RIDE * uh, STOPS[i] * b.Lc);
      const p = along(b.rail, u), x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = INK; ctx.fillRect(x - 1, y, 3, 3);
      ctx.fillStyle = C('steel.4'); ctx.fillRect(x, y + 1, 1, 2);
      drawCard(ctx, x - 8, y + 3, name);
      // the tag under it: the audit already passed two; the tree's flips as he goes by
      const fixed = !wrong || g.reduced || uh >= u;
      const tw = wrong ? 11 : 7, tx = x - Math.floor(tw / 2), ty = y + 17;
      ctx.fillStyle = C('slate.3'); ctx.fillRect(x, y + 15, 1, 2);
      ctx.fillStyle = INK; ctx.fillRect(tx, ty, tw, 7);
      ctx.fillStyle = fixed ? C('green.1') : C('red.1'); ctx.fillRect(tx + 1, ty + 1, tw - 2, 5);
      if (!wrong) icon(ctx, TAG_ICON.tick, tx + 2, ty + 2, 'green.3');
      else if (fixed) { icon(ctx, TAG_ICON.tree, tx + 1, ty + 1, 'green.3'); icon(ctx, TAG_ICON.tick, tx + 6, ty + 2, 'white.2'); }
      else icon(ctx, TAG_ICON.car, tx + 2, ty + 2, 'white.1');
    });
  },

  hero(g, b) {
    const dir = g.dir || 1;
    if (g.s <= SLIDE) {
      const p = along(b.geo.chute, (g.s / SLIDE) * b.Lc);
      return { pose: 'slide', frame: 0, x: p.x, y: p.y, facing: (p.dx < 0 ? -1 : 1) * dir };
    }
    // off the lip: a small pop, then the fall through the cloud floor
    const k = (g.s - SLIDE) / (1 - SLIDE);
    const [[x0, y0], [x1, y1]] = b.geo.drop;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k * k) - 10 * k * (1 - k);
    const rising = dir > 0 ? k < 0.12 : k >= 0.12;
    return { pose: rising ? 'jump' : 'fall', frame: 0, x, y, facing: (x1 >= x0 ? 1 : -1) * dir };
  },
};

// he stamps at the station: lift (the stamp raised), point (pressed onto the tag)
function heroAt(f, b) {
  if (f.reduced || !f.here || f.phase !== 'act') return null;
  const a = f.act;
  for (let k = 0; k < 3; k++) {
    const t0 = k * STEP + MOVE;
    if (a >= t0 && a < t0 + 0.05) return { pose: a < t0 + 0.025 ? 'lift' : 'point', frame: 0, x: b.mark, y: FLOOR, facing: 1 };
  }
  return null;
}

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'handshake',
  facts: ['x-hs', 'x-hs-1', 'x-hs-2', 'x-hs-3'],

  build({ w, h }) {
    const cx = Math.round(w / 2);
    const [back, b] = makeCanvas(w, h);
    backdrop(b, w, h, cx);
    const [mid, m] = makeCanvas(w, h);                       // the line, in front of the path
    const station = cx - D;                                   // where he stamps
    const gx1 = station - CW / 2 - 4;                         // the model's right face
    const gx0 = Math.max(0, gx1 - 34);
    const beltX1 = cx + D + CW / 2 + 6;
    beltFrame(m, gx1 - 2, beltX1);

    // the images: broken and fixed, baked to bytes, with a noise threshold per pixel
    const cards = ART.map((paint, i) => {
      const [bc, bx] = makeCanvas(IW, IH); paint(bx, false);
      const [fc, fx] = makeCanvas(IW, IH); paint(fx, true);
      const r = rng(40 + i * 7);
      const thr = new Float32Array(IW * IH);
      for (let k = 0; k < thr.length; k++) thr[k] = 0.02 + r() * 0.96;
      const [sc, sx] = makeCanvas(IW, IH);
      return { broken: bc, fixed: fc, bd: bake(bc), fd: bake(fc), thr, scratch: sc, sx, img: sx.createImageData(IW, IH) };
    });

    const mark = station - 4;
    return {
      back, mid, cx, station, gx0, gx1, beltX1, cards, mark,
      panel: [cx - 60, cx + 60],
      route: {
        enter: [cx - 4, 0], via: [[cx - 4, FLOOR]], act: [mark, FLOOR],
        leave: [[cx + HATCH, FLOOR]], exit: [cx + HATCH, h],
      },
    };
  },

  draw(ctx, f, b) {
    const { cx, station } = b;
    const a = f.reduced ? 1 : f.act;
    ctx.drawImage(b.back, 0, 0);
    drawPath(ctx, routePoints(b.route), { done: routeDone(b.route, f) });
    ctx.drawImage(b.mid, 0, 0);

    // the belt: three steps of D, each followed by a stamp at the station
    let travel = 0;
    for (let k = 0; k < 3; k++) travel += ease.inOutCubic(span(a, k * STEP, k * STEP + MOVE));
    const bx = travel * D;
    // chevrons running towards the board's end of the line
    ctx.fillStyle = C('cyan.2');
    for (let x = b.gx1 + ((Math.round(bx) % 8) + 8) % 8; x < b.beltX1 - 4; x += 8) {
      ctx.fillRect(x, BELT + 1, 1, 1); ctx.fillRect(x + 1, BELT + 2, 1, 1);
    }

    // the cards: card i stops at cx + (i - 1)·D; the stamp it gets is the step (2 - i)
    const cardX = (i) => Math.round(cx + (i - 1) * D - 3 * D + bx);
    const state = [0, 1, 2].map((i) => {
      const k = 2 - i, stampAt = k * STEP + MOVE + 0.025;
      const r0 = REGEN + i * REGEN_GAP, regen = span(a, r0, r0 + REGEN_LEN);
      return { x: cardX(i), flagged: a >= stampAt, regen, pass: regen >= 0.9 };
    });

    // the board: dark until the notes reach it, then it lights cyan
    const [p0, p1] = b.panel, [py0, py1] = PANEL;
    const lit = a >= LIT;
    ctx.fillStyle = INK; ctx.fillRect(p0 - 1, py0 - 1, p1 - p0 + 2, py1 - py0 + 2);
    ctx.fillStyle = lit ? C('#14305a') : C('slate.1'); ctx.fillRect(p0, py0, p1 - p0, py1 - py0);
    ctx.fillStyle = lit ? C('cyan.2') : C('slate.2');
    ctx.fillRect(p0, py0, p1 - p0, 1); ctx.fillRect(p0, py1 - 1, p1 - p0, 1);
    if (lit) { ctx.fillStyle = 'rgba(60,192,232,0.12)'; ctx.fillRect(p0 - 3, py0 - 3, p1 - p0 + 6, py1 - py0 + 6); }
    // hangers up to the top of the scene
    ctx.fillStyle = C('slate.2'); ctx.fillRect(p0 + 10, 0, 1, py0 - 1); ctx.fillRect(p1 - 11, 0, 1, py0 - 1);
    // three slots at its left end fill as the notes arrive; a lamp at the right
    for (let i = 0; i < 3; i++) {
      const arrived = a >= NOTES[1] + i * NOTE_GAP;
      ctx.fillStyle = arrived ? C('gold.3') : C('slate.0');
      ctx.fillRect(p0 + 3 + i * 4, py0 + 4, 3, 5);
    }
    ctx.fillStyle = lit ? C('cyan.3') : C('slate.0'); ctx.fillRect(p1 - 7, py0 + 4, 4, 5);

    // the cable from the board down to the model; the fine-tune runs along it
    const cab = [[p0 + 1, py1 + 1], [p0 + 1, 27], [Math.round((b.gx0 + b.gx1) / 2), 27]];
    const cl = pathLength(cab), q = span(a, CABLE[0], CABLE[1]);
    let d = 0;
    for (let i = 1; i < cab.length; i++) {
      const [x0, y0] = cab[i - 1], [x1, y1] = cab[i], L = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s <= L; s++) {
        const on = d + s <= q * cl;
        ctx.fillStyle = on ? C('cyan.2') : C('slate.2');
        ctx.fillRect(Math.round(lerp(x0, x1, s / L)), Math.round(lerp(y0, y1, s / L)), 1, 1);
      }
      d += L;
    }

    // the cards, their tags under the belt
    const ff = Math.floor(a * 60);
    for (let i = 0; i < 3; i++) {
      const s = state[i], c = b.cards[i];
      const x = s.x - CW / 2, y = CARD_Y;
      if (x + CW < b.gx1 - 1) continue;                       // still inside the model
      const rim = s.pass ? C('green.2') : s.flagged ? C('red.2') : C('white.1');
      ctx.fillStyle = INK; ctx.fillRect(x, y, CW, CH);
      ctx.fillStyle = rim; ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2);
      ctx.fillStyle = C('white.0'); ctx.fillRect(x + 2, y + 2, IW, IH);
      if (s.regen <= 0) ctx.drawImage(c.broken, x + 2, y + 2);
      else if (s.regen >= 1) ctx.drawImage(c.fixed, x + 2, y + 2);
      else {
        // first half: the broken image dissolves into noise; second: the fix resolves
        const p = s.regen, data = c.img.data;
        for (let k = 0; k < IW * IH; k++) {
          const th = c.thr[k], o = k * 4;
          let src = null, rgb = null;
          if (p < 0.5) { if (th < p * 2) rgb = noiseRGB(k, ff); else src = c.bd; }
          else if (th < (p - 0.5) * 2) src = c.fd; else rgb = noiseRGB(k, ff);
          if (rgb) { data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255; }
          else { data[o] = src[o]; data[o + 1] = src[o + 1]; data[o + 2] = src[o + 2]; data[o + 3] = src[o + 3]; }
        }
        c.sx.putImageData(c.img, 0, 0);
        ctx.drawImage(c.scratch, x + 2, y + 2);
      }
      // the tag on its clip: blank, then the verdict
      const tx = s.x + 4;
      ctx.fillStyle = C('slate.3'); ctx.fillRect(tx + 4, BELT + 5, 1, TAG_Y - BELT - 5);
      ctx.fillStyle = INK; ctx.fillRect(tx, TAG_Y, 9, 7);
      ctx.fillStyle = s.pass ? C('green.1') : s.flagged ? C('red.1') : C('white.1');
      ctx.fillRect(tx + 1, TAG_Y + 1, 7, 5);
      if (s.pass) icon(ctx, ICON.check, tx + 2, TAG_Y + 1, 'green.3');
      else if (s.flagged) icon(ctx, ICON.flag, tx + 3, TAG_Y + 1, 'white.2');
      else { ctx.fillStyle = C('white.0'); ctx.fillRect(tx + 2, TAG_Y + 3, 5, 1); }
    }

    // the model's housing, in front of the cards still inside it
    housing(ctx, b.gx0, b.gx1, a >= CABLE[1]);

    f.drawHero();

    // the stamp in his hand while he works the line
    const he = heroAt(f, b);
    if (he && (he.pose === 'lift' || he.pose === 'point')) {
      const [dx, dy] = handAt(he.pose, 0, he.facing);
      const hx = he.x + dx, hy = he.y + dy;
      if (he.pose === 'lift') {                               // raised over the tag
        ctx.fillStyle = INK; ctx.fillRect(hx - 2, hy - 4, 5, 4);
        ctx.fillStyle = C('wood.2'); ctx.fillRect(hx - 1, hy - 3, 3, 1);
        ctx.fillStyle = C('red.2'); ctx.fillRect(hx - 1, hy - 1, 3, 1);
      } else {                                                // pressed onto it
        ctx.fillStyle = INK; ctx.fillRect(hx - 1, hy - 3, 4, 4);
        ctx.fillStyle = C('wood.2'); ctx.fillRect(hx, hy - 2, 2, 1);
        ctx.fillStyle = C('red.2'); ctx.fillRect(hx, hy - 1, 2, 1);
      }
    }

    // the annotations: a gold note from each flagged tag up to the board
    for (let i = 0; i < 3; i++) {
      const t0 = NOTES[0] + i * NOTE_GAP, t1 = NOTES[1] + i * NOTE_GAP;
      const k = span(a, t0, t1);
      if (k <= 0 || k >= 1 || f.reduced) continue;
      const e = ease.inOutCubic(k);
      const sx0 = cx + (i - 1) * D + 8, sy0 = TAG_Y;
      const sx1 = p0 + 4 + i * 4, sy1 = py0 + 4;
      const nx = Math.round(lerp(sx0, sx1, e)), ny = Math.round(lerp(sy0, sy1, e) - Math.sin(e * Math.PI) * 10);
      ctx.fillStyle = INK; ctx.fillRect(nx - 1, ny - 1, 7, 7);
      icon(ctx, ICON.note, nx, ny, 'gold.3');
      ctx.fillStyle = C('gold.1'); ctx.fillRect(nx + 1, ny + 1, 3, 1); ctx.fillRect(nx + 1, ny + 3, 3, 1);
    }

    fadeEdges(ctx, f.w, f.h);
  },

  hero: heroAt,

  labels(f, b) {
    const a = f.reduced ? 1 : f.act;
    if (a < LIT) return [];
    return [{ text: 'Fine-tuned on my annotations', x: b.cx, y: PANEL[0] + 2, tone: 'cyan' }];
  },

  transit,
};

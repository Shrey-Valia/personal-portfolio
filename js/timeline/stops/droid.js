// Droid Strike Back, 1st place Omi category (San Francisco, Nov 2025).
// Outside on a San Francisco street at night, he touches the Omi pendant
// and says "Forward"; the signal arcs into a simulation window, where a
// digital rescue robot rolls through a burning building. "Extinguish",
// and it foams the fire wall down to embers.
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 6. Contract: docs/BUILDING-STOPS.md.
//
// Art ported from js/themes/droid.js (flames, nightCity, fireKit's bricks
// and boards, the voice bubble, Robot.draw pulled out as drawRobot, the
// FireWall), with every per-tick field turned into a function of f.act and
// the particle foam replaced by fixed arcs. The building sits in a window
// frame (three dots, no title) so the robot reads as digital. The Omi
// pendant is drawn only here and only while he speaks. The move below it
// (transit) is the remapped T4: a small cable car down a steep street,
// ridden one-handed, then a drop through a cloud floor into the snow.

import { sky, fadeEdges, drawPath, routeDone, routePoints, ledge, pathLength } from '../kit.js';
import { col } from '../../art/palette.js';
import { disc, noise1 } from '../../art/draw.js';
import { makeCanvas, ease, rng, clamp, lerp } from '../../engine/util.js';

const C = (r) => col(r);
const INK = '#0b0d17';
const span = (a, t0, t1) => clamp((a - t0) / (t1 - t0), 0, 1);

// ─── layout (game px; x relative to the centre cx) ───────────────────

const FLOOR = 85;                     // the street he stands on
const WIN = { l: -54, r: 62, t: 11, b: 60 };           // the simulation window
const MARK = -44;                     // his mark, under the window's left side
const EXIT = 4;                       // the gap in the street he drops through
const RW = 24;                        // the robot's box width

// the act, as fractions of f.act
const SAY1 = [0, 0.3], SAY2 = [0.52, 0.72];             // "Forward", "Extinguish"
const SIG1 = [0.1, 0.26], SIG2 = [0.58, 0.68];          // the signal arcs into the window
const DRIVE = [0.28, 0.52];
const FOAM = [0.7, 0.92], DOUSE = [0.72, 0.9], PILE = [0.74, 0.94];
const HAPPY = 0.92;

// ─── flames: one column of tongues, palette-cycled (from the theme) ───

const FLAME = ['red.1', 'red.2', 'orange.2', 'gold.2', 'gold.3', 'white.2'];
function flames(ctx, x, base, w, h, t, seed = 0) {
  if (h < 1) return;
  for (let i = 0; i < w; i++) {
    const wob = Math.sin(t / 3.1 + i * 0.9 + seed) * 0.18 + Math.sin(t / 5.3 + i * 0.37 + seed * 2) * 0.12;
    const edge = Math.min(1, Math.min(i + 1, w - i) / 4);
    const hh = Math.max(1, Math.round(h * (0.7 + wob) * (0.45 + 0.55 * edge)));
    const bands = [1, 0.82, 0.6, 0.38, 0.2];
    for (let b = 0; b < bands.length; b++) {
      const bh = Math.round(hh * bands[b]);
      if (bh < 1) continue;
      ctx.fillStyle = C(FLAME[b + (b > 1 && ((Math.floor(t) >> 2) + i) % 5 === 0 ? 1 : 0)]);
      ctx.fillRect(x + i, base - bh, 1, bh);
    }
  }
}

// ─── the rescue robot (Robot.draw from the theme, made pure) ─────────
// An orange box on treads with one round cyan eye, a status screen, a foam
// cannon and an antenna. st: { tread, screen, eye, look, antenna }.

function drawRobot(ctx, x, floor, st) {
  x = Math.round(x);
  const top = floor - 19;
  // treads
  const ty = floor - 6;
  ctx.fillStyle = INK; ctx.fillRect(x + 2, ty - 1, RW - 4, 7); ctx.fillRect(x + 1, ty, RW - 2, 5);
  ctx.fillStyle = C('#2a2d38'); ctx.fillRect(x + 3, ty, RW - 6, 5); ctx.fillRect(x + 2, ty + 1, RW - 4, 3);
  const off = (Math.floor(st.tread) >> 1) & 3;
  ctx.fillStyle = C('#5a6070');
  for (let i = 3 + off; i < RW - 3; i += 4) { ctx.fillRect(x + i, ty, 2, 1); ctx.fillRect(x + RW - i - 2, ty + 4, 2, 1); }
  for (const wx of [5, 10, 15, 20]) { disc(ctx, x + wx - 1, ty + 2, 1, 'steel.3'); ctx.fillStyle = C('steel.1'); ctx.fillRect(x + wx - 1, ty + 2, 1, 1); }
  // base plate
  ctx.fillStyle = INK; ctx.fillRect(x + 1, ty - 3, RW - 2, 3);
  ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 2, ty - 2, RW - 4, 1);
  // the box
  ctx.fillStyle = INK; ctx.fillRect(x, top - 1, RW, 13);
  ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 1, top, RW - 2, 2);
  ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 1, top, RW - 2, 1);
  ctx.fillStyle = C('orange.2'); ctx.fillRect(x + 1, top + 2, RW - 2, 9);
  ctx.fillStyle = C('orange.3'); ctx.fillRect(x + 1, top + 2, RW - 2, 1); ctx.fillRect(x + 1, top + 2, 1, 9);
  ctx.fillStyle = C('orange.1'); ctx.fillRect(x + 1, top + 10, RW - 2, 1);
  ctx.fillStyle = C('white.1'); ctx.fillRect(x + 2, top + 8, 11, 1);              // rescue stripe
  // status screen: the instruction it is running
  ctx.fillStyle = INK; ctx.fillRect(x + 3, top + 2, 10, 6);
  ctx.fillStyle = C('#0f1a24'); ctx.fillRect(x + 4, top + 3, 8, 4);
  screenIcon(ctx, x + 4, top + 3, st.screen);
  // the eye: round, cyan, looking where it's going; an arch when it's happy
  const ex = x + 18, ey = top + 6;
  disc(ctx, ex, ey, 3, 'ink.0');
  disc(ctx, ex, ey, 2, 'white.1');
  if (st.eye === 'happy') {
    ctx.fillStyle = C('cyan.2'); ctx.fillRect(ex - 1, ey - 1, 3, 1); ctx.fillRect(ex - 2, ey, 1, 2); ctx.fillRect(ex + 2, ey, 1, 2);
  } else {
    const lx = st.look || 0;
    ctx.fillStyle = C('cyan.2'); ctx.fillRect(ex - 1 + lx, ey - 1, 2, 3);
    ctx.fillStyle = C('cyan.3'); ctx.fillRect(ex - 1 + lx, ey - 1, 1, 1);
  }
  // foam cannon
  ctx.fillStyle = INK; ctx.fillRect(x + RW - 1, top + 6, 4, 4);
  ctx.fillStyle = C('steel.3'); ctx.fillRect(x + RW - 1, top + 7, 3, 2);
  // antenna: lights up when it hears a command
  ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 3, top - 5, 1, 5);
  ctx.fillStyle = INK; ctx.fillRect(x + 2, top - 8, 4, 4);
  ctx.fillStyle = st.antenna ? C('cyan.3') : C('green.1'); ctx.fillRect(x + 3, top - 7, 2, 2);
  if (st.antenna) { ctx.fillStyle = 'rgba(60,192,232,0.25)'; ctx.fillRect(x, top - 10, 8, 8); }
}
const antennaAt = (x, floor) => [Math.round(x) + 4, floor - 27];
const nozzleAt = (x, floor) => [Math.round(x) + RW + 3, floor - 11];

function screenIcon(ctx, x, y, s) {
  ctx.fillStyle = C('cyan.3');
  if (s === 'listen') {                           // a waveform
    [1, 3, 4, 2].forEach((h, i) => ctx.fillRect(x + 1 + i * 2, y + 2 - Math.floor(h / 2), 1, h));
  } else if (s === 'forward') {                   // ▶
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i, y + i - (i === 2 ? 1 : 0), 1, i === 2 ? 2 : 4 - i * 2);
  } else if (s === 'foam') {                      // drops
    ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 4, y + 2, 2, 2); ctx.fillRect(x + 6, y, 1, 2);
  } else if (s === 'done') {                      // a check
    ctx.fillStyle = C('green.3');
    ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + 3, y + 2, 1, 1); ctx.fillRect(x + 4, y + 1, 1, 1); ctx.fillRect(x + 5, y, 1, 1);
  } else ctx.fillRect(x + 1, y + 3, 2, 1);        // the idle cursor
}

// ─── the backdrop: San Francisco at night (nightCity), the window ────

function city(b, w, h) {
  sky(b, w, h, ['#0d1230', '#141537', '#1b1a40', '#271e47', '#3a2246']);
  const r = rng(77);
  for (let i = 0; i < Math.round(w / 8); i++) {
    b.fillStyle = r() < 0.2 ? C('#c9cfe8') : C('#5d6890');
    b.fillRect(Math.floor(r() * w), Math.floor(4 + r() * 30), 1, 1);
  }
  // hills and a far skyline of towers
  const n = noise1(4);
  b.fillStyle = C('#171836');
  for (let x = 0; x < w; x++) { const y = Math.round(58 - n(x * 0.04) * 10); b.fillRect(x, y, 1, h - y); }
  const rt = rng(12);
  for (let x = 2; x < w - 8;) {
    const bw = 6 + Math.floor(rt() * 9), bh = 14 + Math.floor(rt() * 22), top = 62 - bh;
    b.fillStyle = C('#13142e'); b.fillRect(x, top, bw, h - top);
    if (rt() < 0.3) { b.fillRect(x + Math.floor(bw / 2), top - 5, 1, 5); b.fillStyle = C('red.1'); b.fillRect(x + Math.floor(bw / 2), top - 6, 1, 1); }
    for (let wy = top + 3; wy < 60; wy += 3) for (let wx = x + 1; wx < x + bw - 1; wx += 2) {
      if (rt() < 0.12) { b.fillStyle = rt() < 0.7 ? C('#b8955a') : C('#6f8fc0'); b.fillRect(wx, wy, 1, 1); }
    }
    x += bw + 2 + Math.floor(rt() * 12);
  }
  // a suspension bridge's towers far off in a wide right wing
  if (w >= 220) {
    const bx = w - 44;
    b.fillStyle = C('#1b1b3c');
    for (const tx of [bx, bx + 26]) { b.fillRect(tx, 30, 2, 30); b.fillRect(tx - 1, 36, 4, 1); b.fillRect(tx - 1, 44, 4, 1); }
    for (let x = bx - 14; x < bx + 40; x++) {
      const k = x < bx ? (bx - x) / 14 : x > bx + 26 ? (x - bx - 26) / 14 : Math.abs(x - bx - 13) / 13;
      b.fillRect(x, Math.round(31 + (1 - k * k) * 14 * (x >= bx && x <= bx + 26 ? 1 : 0) + (x < bx || x > bx + 26 ? k * 18 : 0)), 1, 1);
    }
    b.fillRect(bx - 14, 50, 54, 1);
  }
  // fog lying over the bay, flat and faint
  for (let i = 0; i < 2; i++) { b.fillStyle = `rgba(190,196,226,${0.05 + i * 0.02})`; b.fillRect(0, 54 + i * 7, w, 4 + i); }
  // the near street: dark fronts, warm windows
  const rn = rng(19);
  for (let x = -4; x < w;) {
    const bw = 14 + Math.floor(rn() * 16), bh = 14 + Math.floor(rn() * 14), top = FLOOR - bh;
    b.fillStyle = C('#0b0b1c'); b.fillRect(x, top, bw, FLOOR - top);
    b.fillStyle = C('#1a1934'); b.fillRect(x, top, bw, 1);
    for (let wy = top + 3; wy < FLOOR - 4; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
      if (rn() < 0.22) { b.fillStyle = rn() < 0.8 ? C('#c99a52') : C('#6c98c8'); b.fillRect(wx, wy, 2, 2); }
    }
    x += bw + 1 + Math.floor(rn() * 5);
  }
}

// the window: frame, title bar with three dots, and the building's back wall and floor
function simWindow(b, cx) {
  const x0 = cx + WIN.l, x1 = cx + WIN.r, y0 = WIN.t, y1 = WIN.b;
  const I = { x: x0 + 1, y: y0 + 6, w: x1 - x0 - 2, h: y1 - y0 - 7 };
  const yf = y1 - 8;
  // a soft cast of light from the screen onto the night
  b.fillStyle = 'rgba(60,192,232,0.06)'; b.fillRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
  b.fillStyle = INK; b.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  b.fillStyle = C('steel.2'); b.fillRect(x0, y0, x1 - x0, y1 - y0);
  b.fillStyle = C('slate.1'); b.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, 4);
  b.fillStyle = C('slate.2'); b.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, 1);
  [['red.2', 3], ['gold.2', 7], ['green.2', 11]].forEach(([c, dx]) => { b.fillStyle = C(c); b.fillRect(x0 + dx, y0 + 2, 2, 2); });
  // the back wall: fireKit's bricks in mortar, sooted towards the ceiling
  b.fillStyle = C('#2a1512'); b.fillRect(I.x, I.y, I.w, yf - I.y);
  for (let r = 0; (r + 1) * 4 <= yf - I.y + 3; r++) {
    const off = r & 1 ? 4 : 0, y = I.y + r * 4;
    for (let c = -1; c * 8 < I.w; c++) {
      const bx = c * 8 + off, k = ((c * 7 + r * 13) % 10 + 10) % 10;
      b.fillStyle = C(k < 3 ? '#5a2d25' : k < 7 ? '#4c2620' : '#63342a');
      const a = Math.max(0, bx), z = Math.min(I.w, bx + 7);
      if (z > a) b.fillRect(I.x + a, y, z - a, Math.min(3, yf - y));
    }
  }
  for (let y = I.y; y < I.y + 8; y++) { b.fillStyle = `rgba(20,10,14,${(0.75 - (y - I.y) * 0.09).toFixed(2)})`; b.fillRect(I.x, y, I.w, 1); }
  // a cracked window in it, the city behind
  const wx = I.x + 22, wy = I.y + 9;
  b.fillStyle = C('#140c10'); b.fillRect(wx - 2, wy - 2, 22, 16);
  b.fillStyle = C('#141a3a'); b.fillRect(wx, wy, 18, 12);
  const r = rng(31);
  for (let i = 0; i < 7; i++) { b.fillStyle = r() < 0.7 ? C('#c99a52') : C('#6c98c8'); b.fillRect(wx + 1 + Math.floor(r() * 16), wy + 3 + Math.floor(r() * 8), 1, 1); }
  b.fillStyle = C('#140c10'); b.fillRect(wx + 8, wy, 2, 12); b.fillRect(wx, wy + 5, 18, 2);
  b.fillStyle = C('#5a6a9a'); for (let i = 0; i < 5; i++) b.fillRect(wx + 1 + i, wy + 1 + i, 1, 1);
  // burnt floorboards, lit from the fire
  b.fillStyle = C('#e0a066'); b.fillRect(I.x, yf, I.w, 1);
  for (let i = 0; i < I.w; i++) { b.fillStyle = (i >> 3) & 1 ? C('wood.2') : C('wood.1'); b.fillRect(I.x + i, yf + 1, 1, 3); }
  b.fillStyle = C('wood.0'); for (let i = 5; i < I.w; i += 11) b.fillRect(I.x + i, yf + 1, 1, 3);
  b.fillStyle = C('#1d0f0d'); b.fillRect(I.x, yf + 4, I.w, y1 - 1 - yf - 4);
  // embers in the boards along the way
  b.fillStyle = C('orange.2'); for (const ex of [14, 40, 63]) b.fillRect(I.x + ex, yf + 2, 2, 1);
  b.fillStyle = C('red.2'); for (const ex of [26, 52]) b.fillRect(I.x + ex, yf + 3, 1, 1);
  return { x0, x1, y0, y1, I, yf };
}

// ─── the move to Northeastern (T4): the cable car, the cloud floor, snow ──

const CAR = 34;                       // the car's length; it stands 25 px above its rail
const SPOT = 23, POLE = 30;           // where he stands on the front step, and the pole he holds
const HOP_ON = 0.1, HOP_OFF = 0.62;   // shares of the move: hop on, ride, hop off and drop

// a small cable car, drawn level with its front (downhill end) at the right.
// Original art: maroon and cream with a gold belt rail, open ends with
// grab poles, lit windows in the closed middle, a bell on the roof.
function carArt() {
  const [c, x] = makeCanvas(CAR + 2, 27);
  const at = (cx, y) => [cx + 1, y + 26];                 // local (rail = 0) → canvas
  const R = (cx, y, w, hh, color) => { const [a, b] = at(cx, y); x.fillStyle = C(color); x.fillRect(a, b, w, hh); };
  R(1, -25, CAR - 2, 3, INK); R(0, -24, CAR, 2, INK);
  R(2, -25, CAR - 4, 1, '#5a4a44'); R(1, -24, CAR - 2, 1, '#2c2326');
  R(15, -26, 3, 1, 'gold.2');                               // the bell
  R(1, -22, CAR - 2, 17, INK);
  R(2, -22, CAR - 4, 1, '#d8c8a4');                         // cream fascia
  R(2, -21, CAR - 4, 7, '#d8c8a4');                         // the upper body
  for (const wx of [7, 12, 17, 22]) { R(wx, -20, 4, 5, '#c99a52'); R(wx, -17, 4, 2, '#8a6236'); R(wx, -20, 1, 1, '#f0d89a'); }
  R(2, -21, 4, 7, '#1a1420'); R(CAR - 6, -21, 4, 7, '#1a1420');   // the open ends
  R(3, -22, 1, 16, 'steel.4'); R(POLE, -22, 1, 16, 'steel.4');    // grab poles
  R(1, -14, CAR - 2, 1, 'gold.2');                          // the belt rail
  R(2, -13, CAR - 4, 6, '#7a2430'); R(2, -13, CAR - 4, 1, '#9a3440');
  R(2, -8, CAR - 4, 1, '#5a1a24');
  R(0, -6, CAR, 2, INK); R(0, -6, CAR, 1, 'steel.3');       // the running board
  for (const tx of [5, 21]) { R(tx, -4, 8, 2, '#1d1e2e'); }
  for (const wx of [7, 11, 23, 27]) { const [a, b] = at(wx, -2); disc(x, a, b, 1, '#45495a'); }
  return c;
}

// shear it onto the slope: each column drops by m px per px, verticals stay vertical
function shear(src, m, flip) {
  const extra = Math.ceil(Math.abs(m) * CAR) + 1;
  const [c, x] = makeCanvas(src.width, src.height + extra);
  for (let i = 0; i < src.width; i++) {
    const col0 = flip ? src.width - 1 - i : i;
    const dy = Math.round(m * (i - src.width / 2));
    x.drawImage(src, col0, 0, 1, src.height, i, dy + Math.ceil((Math.abs(m) * CAR) / 2), 1, src.height);
  }
  return { c, lift: 26 + Math.ceil((Math.abs(m) * CAR) / 2) };   // rail at the centre column, from the top
}

function carGeometry(w, h, from, to, side, lane) {
  const free = side ? -side : 1;                           // the side the card isn't on
  const m = 0.45 * free;                                    // downhill towards the free side
  const [fx] = from;
  const drive = side ? Math.min(30, Math.round(w / 2) - 18) : 12;
  const spotOff = (free > 0 ? SPOT : CAR - 1 - SPOT) - CAR / 2;
  const xa = fx - spotOff, xb = xa + free * drive;          // the car's centre at each end of its run
  const ya = Math.round(h * 0.22) + 4, yb = ya + Math.abs(m) * drive;
  const rail = (x) => ya + m * (x - xa);
  return { free, m, xa, xb, ya, yb, rail, spotOff, to, lane };
}

// where his feet are on the step with the car centred at cx
function spotOn(g, cx) {
  const x = cx + g.spotOff;
  return [x, g.rail(cx) + Math.round(g.m * g.spotOff) - 4];
}

function streetArt(w, h, g) {
  const [c, b] = makeCanvas(w, h);
  // the hill: a row of narrow houses stepping down under the track (a faint silhouette)
  const x0 = g.free > 0 ? g.xa - 26 : g.xb - 30, x1 = g.free > 0 ? g.xb + 30 : g.xa + 26;
  const r = rng(8);
  for (let x = Math.max(0, x0); x < Math.min(w, x1);) {
    const hw = 7 + Math.floor(r() * 3), base = Math.round(g.rail(x + hw / 2)) + 3;
    const tall = Math.min(18 + Math.floor(r() * 6), Math.round(h * 0.66) - base);
    b.fillStyle = C('#141a3c');
    b.fillRect(x, base, hw, tall);
    b.fillStyle = C('#111637'); b.fillRect(x, base + tall, hw, Math.max(0, Math.min(6, Math.round(h * 0.66) - base - tall)));
    for (let j = 0; j < 3; j++) b.fillRect(x + j, base - 3 + j, hw - j * 2, 1);
    b.fillStyle = C(r() < 0.5 ? '#4a3a40' : '#232a4c'); b.fillRect(x + 2, base + 3, 3, 3);
    b.fillStyle = C('#232a4c'); b.fillRect(x + 2, base + 9, 3, 3);
    x += hw + 1;
  }
  // the street and its rails, down the slope
  const xs = Math.max(0, Math.round(Math.min(g.xa, g.xb) - 26)), xe = Math.min(w, Math.round(Math.max(g.xa, g.xb) + 26));
  for (let x = xs; x < xe; x++) {
    const y = Math.round(g.rail(x));
    b.fillStyle = INK; b.fillRect(x, y - 1, 1, 6);
    b.fillStyle = C('steel.4'); b.fillRect(x, y, 1, 1);
    b.fillStyle = C('slate.1'); b.fillRect(x, y + 1, 1, 3);
    if (x % 3) { b.fillStyle = C('slate.0'); b.fillRect(x, y + 2, 1, 1); }      // the cable slot
  }
  // the cloud floor, with the snow beginning under it
  const top = Math.round(h * 0.66), bot = Math.round(h * 0.78);
  const rc = rng(41);
  // puffs taper off at both ends, so the floor never shows a cut edge
  const end = (x) => Math.min(1, Math.max(0, Math.min(x - 2, w - 2 - x) / 14));
  b.fillStyle = C('#171d49'); b.fillRect(10, top + 5, w - 20, bot - top - 5);
  for (let i = 0; i < Math.ceil(w / 9) + 2; i++) {
    const x = i * 9 + rc() * 5 - 4, y = top + 3 + rc() * 3, rr = Math.round((4 + Math.floor(rc() * 3)) * end(x));
    if (rr < 2) continue;
    disc(b, x, y + 2, rr, '#171d49'); disc(b, x, y, rr, '#20285a');
  }
  for (let i = 0; i < Math.ceil(w / 11) + 2; i++) { const x = i * 11 + rc() * 6 - 3, rr = Math.round((3 + Math.floor(rc() * 2)) * end(x)); if (rr >= 2) disc(b, x, bot - 1 + rc() * 2, rr, '#151a44'); }
  return { c, top, bot };
}

// flakes under the cloud floor, thicker towards Boston; they fall as you scroll
function snow(ctx, w, h, top, s, n) {
  const r = rng(5);
  for (let i = 0; i < n; i++) {
    const x0 = r() * w, y0 = r(), big = r() < 0.2, depth = r();
    const band = h - top;
    const y = top + ((y0 * band + s * (30 + depth * 30)) % band);
    if ((y - top) / band < 0.35 * r()) continue;           // fewer near the cloud floor
    const x = Math.round(x0 + Math.sin(y / 9 + i) * 1.5);
    ctx.fillStyle = C(big ? 'white.2' : depth < 0.5 ? 'white.0' : 'white.1');
    ctx.fillRect(x, Math.round(y), big ? 2 : 1, big ? 2 : 1);
  }
}

const transit = {
  build({ w, h, from, to, side = 0, lane }) {
    if (lane == null) lane = side ? 20 : 0;                  // the bench doesn't pass it
    const g = carGeometry(w, h, from, to, side, lane);
    const street = streetArt(w, h, g);
    const car = shear(carArt(), Math.abs(g.m), g.free < 0);
    const a = spotOn(g, g.xa), b = spotOn(g, g.xb);
    const pts = [from, a, b, to];
    return { g, street, car, a, b, pts, len: pathLength(pts), legs: [pathLength([from, a]), pathLength([a, b])] };
  },

  draw(ctx, g, b) {
    ctx.drawImage(b.street.c, 0, 0);
    const s = g.reduced ? 1 : g.s;
    // the path: the hop on, the ride, the drop
    const k1 = clamp(s / HOP_ON, 0, 1), k2 = span(s, HOP_ON, HOP_OFF), k3 = span(s, HOP_OFF, 1);
    const done = g.reduced ? Infinity : k1 * b.legs[0] + k2 * b.legs[1] + k3 * (b.len - b.legs[0] - b.legs[1]);
    drawPath(ctx, b.pts, { done });
    // the car: waits at the top, rides down with him, waits at the bottom
    const cx = lerp(b.g.xa, b.g.xb, g.reduced ? 1 : ease.inOutCubic(k2));
    ctx.drawImage(b.car.c, Math.round(cx - CAR / 2 - 1), Math.round(b.g.rail(cx)) - b.car.lift);
    snow(ctx, b.street.c.width, b.street.c.height, b.street.bot - 4, g.reduced ? 0 : s, 26);
  },

  hero(g, b) {
    const dir = g.dir || 1, G = b.g;
    if (g.s < HOP_ON) {                                     // the hop down onto the step
      const k = g.s / HOP_ON, [x0, y0] = b.pts[0], [x1, y1] = b.a;
      return { pose: dir > 0 ? 'fall' : 'jump', frame: 0, x: lerp(x0, x1, k), y: lerp(y0, y1, k * k), facing: G.free };
    }
    if (g.s < HOP_OFF) {                                    // riding one-handed, facing downhill
      const cx = lerp(G.xa, G.xb, ease.inOutCubic(span(g.s, HOP_ON, HOP_OFF)));
      const [x, y] = spotOn(G, cx);
      return { pose: 'hangOne', frame: 0, x, y, facing: G.free };
    }
    // off the step: a small hop, then down through the cloud floor into the snow
    const k = span(g.s, HOP_OFF, 1), [x0, y0] = b.b, [x1, y1] = G.to;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k * k) - 12 * k * (1 - k);
    const rising = dir > 0 ? k < 0.15 : k >= 0.15;
    return { pose: rising ? 'jump' : 'fall', frame: 0, x, y, facing: (x1 >= x0 ? 1 : -1) * dir };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

function heroAt(f, b) {
  if (!f.here || !(f.reduced || f.phase === 'act')) return null;
  const a = f.reduced ? 1 : f.act;
  const talking = f.reduced || (a >= SAY1[0] && a < SAY1[1]) || (a >= SAY2[0] && a < SAY2[1]);
  if (!talking) return null;
  // the mouth moves with the scroll while the word is said, then closes
  const sayK = a < SAY1[1] ? span(a, SAY1[0] + 0.02, SAY1[1] - 0.06) : span(a, SAY2[0] + 0.01, SAY2[1] - 0.04);
  const frame = f.reduced ? 0 : sayK > 0 && sayK < 1 ? Math.floor(a * 48) % 2 : 1;
  return { pose: 'speak', frame, x: b.mark, y: FLOOR, facing: 1 };
}

export default {
  id: 'droid',
  facts: ['a-droid', 'a-droid-build'],

  build({ w, h }) {
    const cx = Math.round(w / 2);
    const [back, b] = makeCanvas(w, h);
    city(b, w, h);
    const win = simWindow(b, cx);
    // the street: asphalt with the cable-car rails in it, a gap he drops through
    const gx0 = cx + EXIT - 6, gx1 = cx + EXIT + 6;
    b.fillStyle = C('#0a0c1a'); b.fillRect(0, FLOOR + 4, w, h - FLOOR - 4);
    ledge(b, 0, FLOOR, gx0, 'asphalt');
    ledge(b, gx1, FLOOR, w - gx1, 'asphalt');
    for (const [a0, a1] of [[0, gx0], [gx1, w]]) {
      b.fillStyle = C('steel.4'); b.fillRect(a0, FLOOR + 1, a1 - a0, 1);
      b.fillStyle = C('slate.0'); for (let x = a0 + 2; x < a1 - 1; x += 5) b.fillRect(x, FLOOR + 2, 2, 1);
    }
    const fire = { x: win.x1 - 27, w: 20 };
    return {
      back, cx, win, fire,
      mark: cx + MARK,
      rx0: win.x0 + 5, rx1: fire.x - 6 - RW - 3,
      route: {
        enter: [cx - 6, 0], via: [[cx - 6, FLOOR]], act: [cx + MARK, FLOOR],
        leave: [[cx + EXIT, FLOOR]], exit: [cx + EXIT, h],
      },
    };
  },

  draw(ctx, f, b) {
    const a = f.reduced ? 1 : f.act;
    const { win, fire } = b, yf = win.yf;
    ctx.drawImage(b.back, 0, 0);
    drawPath(ctx, routePoints(b.route), { done: routeDone(b.route, f) });
    // the path runs behind the window, so it's drawn again over the path
    ctx.drawImage(b.back, win.x0 - 2, win.y0 - 2, win.x1 - win.x0 + 4, win.y1 - win.y0 + 4, win.x0 - 2, win.y0 - 2, win.x1 - win.x0 + 4, win.y1 - win.y0 + 4);

    // ── inside the window ──
    const t = a * 60;                                     // the fire flickers as you scroll
    const k = 1 - span(a, DOUSE[0], DOUSE[1]);            // how much fire is left
    if (k > 0) {
      ctx.fillStyle = `rgba(255,110,40,${(0.08 * k).toFixed(3)})`;
      ctx.fillRect(fire.x - 14, win.I.y, fire.w + 26, yf - win.I.y);
      ctx.fillRect(fire.x - 6, win.I.y + 8, fire.w + 10, yf - win.I.y - 8);
      flames(ctx, fire.x - 1, yf, fire.w + 2, Math.round(30 * k), t, 3);
    }
    // low flames licking the back wall along the way
    flames(ctx, win.I.x + 8, yf, 6, 5, t + 9, 1);
    flames(ctx, win.I.x + 46, yf, 5, 4, t + 21, 5);
    // the foam left on the floor, and steam once it's out
    const pile = f.reduced ? 1 : span(a, PILE[0], PILE[1]);
    if (pile > 0) {
      for (let i = 0; i < 5; i++) disc(ctx, fire.x + 2 + i * 4, yf - 1, Math.max(1, Math.round((2 + (i % 2)) * pile)), i % 2 ? 'white.1' : 'white.2');
      if (k < 0.5) {
        ctx.fillStyle = 'rgba(150,156,176,0.3)';
        for (let i = 0; i < 3; i++) { const r = 2 + i, sx = fire.x + 4 + i * 6, sy = yf - 9 - i * 4; ctx.fillRect(sx - r, sy - r + 1, r * 2 + 1, r * 2 - 1); ctx.fillRect(sx - r + 1, sy - r, r * 2 - 1, r * 2 + 1); }
        ctx.fillStyle = C('red.2'); ctx.fillRect(fire.x + 5, yf - 1, 1, 1); ctx.fillRect(fire.x + 13, yf - 1, 1, 1);
      }
    }
    // the robot: listens, rolls forward, foams the fire, squints happy
    const drive = ease.inOutCubic(span(a, DRIVE[0], DRIVE[1]));
    const rx = lerp(b.rx0, b.rx1, drive);
    const heard = (a >= SIG1[1] && a < DRIVE[1]) || (a >= SIG2[1] && a < FOAM[1]);
    const screen = a >= HAPPY ? 'done'
      : a >= FOAM[0] && a < FOAM[1] ? 'foam'
      : a >= DRIVE[0] && a < DRIVE[1] ? 'forward'
      : (a >= SIG1[0] && a < SIG1[1] + 0.02) || (a >= SIG2[0] && a < SIG2[1] + 0.02) ? 'listen' : 'idle';
    const listening = (a >= SIG1[0] && a < DRIVE[0]) || (a >= SIG2[0] && a < FOAM[0]);
    drawRobot(ctx, rx, yf, { tread: rx - b.rx0, screen, eye: a >= HAPPY ? 'happy' : 'look', look: listening ? -1 : 1, antenna: heard });
    // foam: three fixed arcs from the cannon to the fire, flowing with the scroll
    const q = span(a, FOAM[0], FOAM[1]);
    if (q > 0 && q < 1 && !f.reduced) {
      const [nx, ny] = nozzleAt(rx, yf);
      for (let j = 0; j < 3; j++) {
        const tx = fire.x + 3 + j * 7, ty = yf - 3 - j * 7;
        for (let i = 0; i < 6; i++) {
          const u = (q * 5 + i / 6) % 1;
          const x = Math.round(lerp(nx, tx, u)), y = Math.round(lerp(ny, ty, u) - 9 * Math.sin(u * Math.PI));
          ctx.fillStyle = C((i + j) % 2 ? 'white.2' : 'cyan.3');
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // ── outside: him, the pendant, the bubble, the signal ──
    f.drawHero();
    const he = heroAt(f, b);
    if (he) {
      // the Omi pendant on its cord, only while he speaks
      const px = he.x, py = he.y;
      ctx.fillStyle = C('slate.2'); ctx.fillRect(px - 3, py - 14, 1, 1); ctx.fillRect(px - 2, py - 13, 1, 1);
      ctx.fillStyle = C('slate.3'); ctx.fillRect(px - 2, py - 12, 4, 4);
      ctx.fillStyle = C('teal.3'); ctx.fillRect(px - 1, py - 11, 2, 2);
      // the voice bubble: a waveform (the word is the HTML label beside it)
      const bx = b.mark + 10, by = 63;
      ctx.fillStyle = INK; ctx.fillRect(bx - 1, by - 1, 22, 11); ctx.fillRect(bx - 4, by + 5, 4, 3);
      ctx.fillStyle = C('#14203a'); ctx.fillRect(bx, by, 20, 9); ctx.fillRect(bx - 3, by + 6, 3, 1);
      ctx.fillStyle = C('cyan.1'); ctx.fillRect(bx, by, 20, 1);
      const live = he.frame === 0 && !f.reduced;
      for (let i = 0; i < 8; i++) {
        const hgt = f.reduced ? [2, 4, 6, 3, 5, 2, 4, 1][i] : live ? 1 + Math.round(5 * Math.abs(Math.sin(a * 41 + i * 1.3))) : 1;
        ctx.fillStyle = C(i % 2 ? 'cyan.3' : 'teal.3');
        ctx.fillRect(bx + 2 + i * 2, by + 5 - Math.ceil(hgt / 2), 1, hgt);
      }
    }
    // the command, as signal dots arcing from the bubble to the antenna
    for (const [s0, s1, rxx] of [[SIG1[0], SIG1[1], b.rx0], [SIG2[0], SIG2[1], b.rx1]]) {
      const qq = span(a, s0, s1);
      if (qq <= 0 || qq >= 1 || f.reduced) continue;
      const [ax, ay] = antennaAt(rxx, yf), sx = b.mark + 22, sy = 62;
      for (let j = 0; j < 4; j++) {
        const u = qq * 1.3 - j * 0.1;
        if (u < 0 || u > 1) continue;
        const x = Math.round(lerp(sx, ax, u)), y = Math.round(lerp(sy, ay, u) - 16 * Math.sin(u * Math.PI));
        ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, 4, 4);
        ctx.fillStyle = C('cyan.3'); ctx.fillRect(x, y, 2, 2);
      }
    }
    fadeEdges(ctx, f.w, f.h);
  },

  hero: heroAt,

  labels(f, b) {
    const a = f.reduced ? 1 : f.act;
    const at = { x: b.mark + 32, y: 62, tone: 'cyan', align: 'left' };
    if (f.reduced) return [{ text: 'Extinguish', ...at }];
    if (a >= SAY1[0] + 0.02 && a < SAY1[1]) return [{ text: 'Forward', ...at }];
    if (a >= SAY2[0] + 0.01 && a < SAY2[1]) return [{ text: 'Extinguish', ...at }];
    return [];
  },

  transit,
};

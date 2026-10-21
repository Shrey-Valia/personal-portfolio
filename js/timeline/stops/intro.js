// Intro · the top of the path. Shrey's room in Dublin, CA, at night: he
// waves from his desk (the page opens here, in the hold), and as the
// visitor scrolls he gets up, grabs his black backpack, shoulders it and
// walks out of the door onto the steel start ledge. His name, tagline and
// links are the HTML above the scene, so the scene draws no words.
//
// The page starts this stop in its hold at hold 0.5 (layout.js introP), so
// the hold is split in two: up to 0.5 he sits and waves (the idle clock
// runs the wave, then typing, at 4 fps), past 0.5 the scroll plays the
// leave sequence. The act (only ever seen on the bench) is the same
// sequence backwards: he comes in, drops the bag and sits down.
//
// transit (T0, to Vincio): he hops off the ledge, falls through a cloud
// wisp and makes three hops down staggered video clips.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 1, §2 T0. Contract: docs/BUILDING-STOPS.md.

import { pose, handAt, drawPath, sky, fadeEdges, ledge, coreX, FLOOR } from '../kit.js';
import { col } from '../../art/palette.js';
import { disc, noise1 } from '../../art/draw.js';
import { makeCanvas, rng, clamp, lerp } from '../../engine/util.js';

const INK = col('ink.0');
const R = (g, x, y, w, h, c) => { g.fillStyle = col(c); g.fillRect(Math.round(x), Math.round(y), w, h); };
const box = (g, x, y, w, h, c, hi, lo) => {
  R(g, x - 1, y - 1, w + 2, h + 2, 'ink.0');
  R(g, x, y, w, h, c);
  if (hi) R(g, x, y, w, 1, hi);
  if (lo) R(g, x, y + h - 1, w, 1, lo);
};

// ─── poses: Shrey before the backpack goes on ─────────────────────────
// Rows copied from js/art/sprites/hero.js; np() takes the pack off his back
// (v b B are the pack) and closes the shirt where it was.

const BLANK = '..............';
const HEAD = [
  '.....hhhhh....',
  '....hhHHHhhh..',
  '...hhHHhhHhhh.',
  '...fhhhhhhhhh.',
  '...ffFFsssSSs.',
  '...fFdsssseSs.',
  '...FFdssssssSs',
  '....Fsssssmsd.',
  '.....ddsssdd..',
];
const HEAD_BLINK = HEAD.map((r, i) => (i === 5 ? '...fFdssssdSs.' : r));
const T_IDLE = ['...vbb.dsd....', '..vbbBkkKKkk..', '..vbbBkkKKgk..', '..vbbBkkKkkk..', '..vbbBkkdskk..', '...vbbjkkkkj..'];
const T_FWD = ['...vbb.dsd....', '..vbbBkkkKKk..', '..vbbBkkkkKKd.', '..vbbBkkkgkss.', '..vbbBkkkkkk..', '...vbbjkkkkj..'];
const T_BACK = ['...vbb.dsd....', '..vbbKKkkkkk..', '..vbKKkkkkgk..', '..vbsdkkkkkk..', '..vbbBkkkkkk..', '...vbbjkkkkj..'];
const np = (rows) => rows.map((r) => {
  r = r.replace(/[vbB]/g, '.');
  return r[5] === '.' && 'kK'.includes(r[6]) ? r.slice(0, 5) + 'j' + r.slice(6) : r;
});
const IDLE_NP = np(T_IDLE), FWD_NP = np(T_FWD), BACK_NP = np(T_BACK);
const ARM_NP = IDLE_NP.map((r, i) => (i === 4 ? '.....jkkKkkk..' : r));      // the hanging hand removed
const FWD_LOW = FWD_NP.map((r, i) => (i === 2 ? '.....jkkkkKK..' : i === 3 ? '.....jkkkgkKd.' : i === 4 ? '.....jkkkkkss.' : r));
// sat on a chair: the head and torso drop 4 rows, thighs forward, shins down
const SIT = ['......qqpppPPP', '..........pPP.', '.........nnNN.'];
const sat = (head, torso) => [BLANK, BLANK, BLANK, BLANK, ...head, ...torso, ...SIT];
// crouched to pick something up (hero.js CROUCH, pack off, hand reaching low)
const CROUCH_NP = [BLANK, BLANK, BLANK, BLANK, ...HEAD,
  '.......dsd....', '.....jkkKKkk..', '.....jkkKKkkd.', '.....jkkkkkss.',
  '....qqqpppP...', '...qqqpppPPp..', '...qq....pPp..', '...nnn...nnnn.', '...NNN...NNNN.'];
// the wave arm (poses.js ARM.wave1/2), moved down 4 rows for the seated frame
const WAVE = [
  { patch: [[13, 11, 'kk'], [12, 13, 'd'], [11, 14, 'd'], [10, 15, 'd'], [8, 14, 'ss'], [9, 14, 'ss']], hand: [8, 15] },
  { patch: [[13, 11, 'kk'], [12, 13, 'd'], [11, 14, 'd'], [10, 14, 'd'], [9, 14, 'd'], [7, 13, 'ss'], [8, 13, 'ss']], hand: [7, 14] },
];

let LOCAL = null;
function poses() {
  return LOCAL || (LOCAL = {
    sitWave: WAVE.map((a) => pose({ rows: sat(HEAD, ARM_NP), patch: a.patch, hand: a.hand })),
    sitType: [pose({ rows: sat(HEAD, FWD_NP), hand: [16, 12] }), pose({ rows: sat(HEAD, FWD_LOW), hand: [17, 12] })],
    sitBlink: [pose({ rows: sat(HEAD_BLINK, FWD_NP), hand: [16, 12] })],
    crouchNP: [pose({ rows: CROUCH_NP, hand: [16, 13] })],
    standNP: [pose({ torso: IDLE_NP })],
    runNP: [pose({ torso: BACK_NP, legs: 'L_RUN1' }), pose({ torso: IDLE_NP, legs: 'L_RUN2' }), pose({ torso: FWD_NP, legs: 'L_RUN3' }), pose({ torso: IDLE_NP, legs: 'L_RUN4' })],
    carryNP: [pose({ torso: ARM_NP, patch: [[10, 11, 'kk'], [11, 12, 'dss'], [12, 12, 'dss']], hand: [11, 14] })],
  });
}

// ─── where things are (x from the core's left edge) ───────────────────

const ROOM = { l: 4, r: 73, top: 34 };       // outer walls, ceiling
const CHAIR = 33;                            // his feet when seated
const PACK = 60;                             // the bag on the floor, left edge
const GRAB = 54;                             // where he stands to pick it up
const DOOR = 70;                             // his mark: in the doorway
const EDGE = 84;                             // the end of the steel ledge
const DROP = 88;                             // he drops off here (the exit)

// the leave sequence, k 0 → 1: seated, up, over to the bag, pick it up,
// shoulder it, out to the door. Returns where he is and whether he has it.
const SEQ = [
  [0.00, 'sit'], [0.07, 'up'], [0.13, 'walk'], [0.45, 'reach'], [0.56, 'carry'], [0.70, 'on'], [0.78, 'go'], [1.01, 'end'],
];
function leave(k) {
  let i = 0;
  while (k >= SEQ[i + 1][0]) i++;
  const [a, step] = SEQ[i], b = SEQ[i + 1][0], u = clamp((k - a) / (b - a), 0, 1);
  switch (step) {
    case 'sit': return { step, x: CHAIR, bag: 'floor' };
    case 'up': return { step, x: CHAIR, bag: 'floor' };
    case 'walk': return { step, x: lerp(CHAIR, GRAB, u), bag: 'floor' };
    case 'reach': return { step, x: GRAB, bag: u < 0.5 ? 'floor' : 'hand' };
    case 'carry': return { step, x: GRAB, bag: 'hand' };
    case 'on': return { step, x: GRAB, bag: 'back' };
    default: return { step: 'go', x: lerp(GRAB, DOOR, step === 'go' ? u : 1), bag: 'back' };
  }
}

// which way the story runs at this f: k along the leave sequence, and +1
// when scrolling down plays it forwards (hold) or -1 backwards (the act)
function story(f) {
  if (f.phase === 'act') return { k: 1 - f.act, run: -1 };
  if (f.phase === 'hold') return { k: clamp((f.hold - 0.5) * 2, 0, 1), run: 1 };
  return { k: 1, run: 1 };                   // walking in, out, or not home
}

// the seated idle: a wave on load, then typing, a wave again every 8 s
// (he turns his chair round to wave, back to the screen to type)
function seated(f) {
  if (f.reduced) return { pose: 'sitWave', frame: 1, facing: -1 };
  const t = f.t % 8000;
  if (t < 1500) return { pose: 'sitWave', frame: Math.floor(t / 250) % 2, facing: -1 };
  if (t > 5200 && t < 5400) return { pose: 'sitBlink', frame: 0, facing: 1 };
  return { pose: 'sitType', frame: Math.floor(t / 250) % 2, facing: 1 };
}

// ─── the backdrop: night over the Tri-Valley, his house on the hill ───

function paintBack(w, h) {
  const x0 = coreX(w), X = (v) => x0 + v;
  const [c, g] = makeCanvas(w, h);
  sky(g, w, h, ['#121a47', '#19225a', '#202a66']);

  // the moon, a crescent cut from a disc
  const mx = X(134), my = 19;
  for (let y = -6; y <= 6; y++) {
    const a = Math.floor(Math.sqrt(36 - y * y + 4.8));
    for (let x = -a; x <= a; x++) {
      const dx = x - 3, dy = y + 2;
      if (dx * dx + dy * dy < 26) continue;
      g.fillStyle = col(x < -3 || y > 3 ? '#d6cba8' : '#f4ead0');
      g.fillRect(mx + x, my + y, 1, 1);
    }
  }

  // clouds far below and behind
  cloud(g, X(118), 92, 22, 1);
  cloud(g, X(152), 97, 18, 2);
  cloud(g, X(-30), 97, 22, 3);

  // his house sits on a lump of the golden hills, adrift above the clouds;
  // a valley oak on a smaller one in the left wing
  island(g, X(-4), X(80), 83, 15, 21);
  island(g, X(-36), X(-8), 77, 7, 9);
  const ox = X(-22);
  R(g, ox - 2, 66, 4, 12, 'ink.0'); R(g, ox - 1, 66, 2, 11, '#3d2a24');
  for (const [dx, dy, r, c] of [[0, 62, 8, 'ink.0'], [-7, 66, 5, 'ink.0'], [7, 65, 6, 'ink.0'], [0, 62, 7, '#1f3326'], [-7, 66, 4, '#1f3326'], [7, 65, 5, '#1f3326'], [-2, 59, 4, '#2a4430'], [5, 61, 3, '#2a4430']]) disc(g, ox + dx, dy, r, c);
  cloud(g, X(80), 96, 26, 0);

  paintHouse(g, X);
  ledge(g, X(ROOM.r), FLOOR, EDGE - ROOM.r, 'steel');
  return c;
}

// a floating lump of hill: dry grass on top, earth tapering away below
function island(g, a, b, top, depth, seed) {
  const n = noise1(seed), mid = (a + b) / 2, half = (b - a) / 2;
  for (let x = a; x <= b; x++) {
    const k = (x - mid) / half;
    const bot = Math.round(top + 3 + depth * Math.sqrt(Math.max(0, 1 - k * k)) * (0.75 + n(x * 0.15) * 0.4));
    R(g, x, top - 1, 1, bot - top + 2, 'ink.0');
    R(g, x, top, 1, bot - top, '#2a2236');
    R(g, x, top + 3 + ((x >> 3) & 1), 1, 1, '#352b40');
    if (bot - top > 8) R(g, x, top + 7 + ((x * 7) % 3 === 0 ? 1 : 0), 1, 1, '#211b2c');
    R(g, x, top, 1, 2, '#5b5636');
    if ((x * 5) % 7 === 0) R(g, x, top - 1, 1, 1, '#5b5636');
    R(g, x, top + 2, 1, 1, '#3f3a2c');
  }
}

// a flat night cloud: a puff of discs, lit along its top by the moon
function cloud(g, cx, cy, w, seed) {
  const r = rng(40 + seed);
  const puffs = Array.from({ length: 5 }, (_, i) => [cx + (i / 4 - 0.5) * w + (r() - 0.5) * 4, cy - r() * 3, 3 + Math.round(r() * w * 0.12)]);
  for (const [x, y, rr] of puffs) disc(g, x, y + 1, rr + 1, '#252f60');
  for (const [x, y, rr] of puffs) disc(g, x, y, rr, '#333f75');
  for (const [x, y, rr] of puffs) disc(g, x - 1, y - 1, Math.max(1, rr - 2), '#45528a');
}

function paintHouse(g, X) {
  const L = X(ROOM.l), Rr = X(ROOM.r), top = ROOM.top;
  // the roof: a gable of dark tiles over the cut-away room, a lit round vent
  const peak = Math.round((L + Rr) / 2), rise = 21;
  for (let y = 0; y <= rise; y++) {
    const half = Math.round(((Rr - L) / 2 + 4) * (y / rise));
    const yy = top - rise + y;
    R(g, peak - half - 1, yy, half * 2 + 3, 1, 'ink.0');
    if (y > 0) R(g, peak - half, yy, half * 2 + 1, 1, y % 3 === 0 ? 'indigo.1' : '#232b5e');
  }
  for (let y = 4; y <= rise; y += 3) {
    const half = Math.round(((Rr - L) / 2 + 4) * (y / rise));
    R(g, peak - half, top - rise + y, 2, 1, 'indigo.2');
  }
  box(g, peak - 3, top - 11, 7, 5, '#ffd27a', null, '#c27a18');
  R(g, peak, top - 11, 1, 5, 'ink.0');
  R(g, L - 4, top - 1, Rr - L + 8, 2, 'ink.0');                 // eaves

  // inside: plum walls, a lower panel, the floorboards
  R(g, L, top + 1, Rr - L, FLOOR - top - 1, '#2a2747');
  R(g, L, 70, Rr - L, FLOOR - 70, '#24213e');
  R(g, L, 70, Rr - L, 1, '#34304f');
  R(g, L, FLOOR - 2, Rr - L, 2, '#1c1a33');
  R(g, L, top + 1, Rr - L, 2, '#211e3a');                       // shadow under the ceiling
  // the lamp's warm pool and the monitor's glow on the wall (flat steps)
  g.save(); g.beginPath(); g.rect(L, top + 1, Rr - L, FLOOR - top - 1); g.clip();
  g.fillStyle = 'rgba(255,214,120,0.07)'; g.beginPath(); g.arc(X(56), 68, 17, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,214,120,0.07)'; g.beginPath(); g.arc(X(56), 68, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(111,214,200,0.06)'; g.fillRect(X(39), 57, 18, 16);
  g.restore();

  // walls cut away at the front: stucco edges
  for (const wx of [L - 3, Rr]) {
    const bottom = wx === Rr ? 54 : FLOOR;
    R(g, wx - 1, top, 5, bottom - top + 1, 'ink.0');
    R(g, wx, top + 1, 3, bottom - top - 1, '#b8ad92');
    R(g, wx, top + 1, 1, bottom - top - 1, '#d8ccb0');
  }
  R(g, Rr - 1, 53, 5, 2, 'ink.0');                              // the door's lintel
  R(g, Rr, 54, 3, 1, '#8a6040');

  // the floor slab, the stucco base under it
  R(g, L - 4, FLOOR, Rr - L + 4, 5, 'ink.0');
  R(g, L - 3, FLOOR, Rr - L + 3, 3, '#6b4529');
  R(g, L - 3, FLOOR, Rr - L + 3, 1, '#8a6040');
  for (let x = L; x < Rr; x += 9) R(g, x, FLOOR + 1, 1, 2, '#4d301c');
  R(g, L - 3, FLOOR + 5, Rr - L + 3, 2, '#3c4152');

  // the window over the bed: the hills outside, a star, curtains
  box(g, X(10), 40, 15, 15, '#bfb6a0');
  R(g, X(11), 41, 13, 13, '#16224e');
  R(g, X(11), 50, 13, 4, '#101838');
  R(g, X(11), 49, 5, 1, '#101838'); R(g, X(18), 48, 6, 2, '#101838');
  R(g, X(20), 43, 1, 1, '#fbf8f1'); R(g, X(13), 45, 1, 1, '#a8b4d8');
  R(g, X(17), 41, 1, 13, '#bfb6a0'); R(g, X(11), 47, 13, 1, '#bfb6a0');
  for (const cx of [X(8), X(24)]) { R(g, cx, 39, 3, 17, 'ink.0'); R(g, cx + 1 - (cx > X(16) ? 0 : 0), 39, 2, 16, '#156f73'); R(g, cx + 1, 39, 1, 16, '#21a3a0'); }
  R(g, X(7), 38, 21, 1, 'ink.0');

  // the bed
  R(g, X(7), 68, 3, 14, 'ink.0'); R(g, X(8), 69, 1, 13, '#6b3f22');
  box(g, X(9), 74, 17, 3, '#e3e6ee');
  box(g, X(14), 73, 12, 4, '#156f73', '#21a3a0');
  box(g, X(10), 71, 4, 3, '#fbf8f1');
  R(g, X(9), 77, 17, 5, 'ink.0'); R(g, X(10), 77, 15, 4, '#6b3f22'); R(g, X(10), 77, 15, 1, '#8a6040');

  // a poster (his hills at sunset), a shelf of books with a plant
  box(g, X(29), 42, 8, 10, '#c27a48');
  R(g, X(29), 46, 8, 6, '#5a2f45');
  for (let i = 0; i < 4; i++) R(g, X(30) + i, 47 - i, 7 - i * 2 > 0 ? 7 - i * 2 : 1, 1, '#5a2f45');
  R(g, X(34), 44, 2, 2, '#ffe08a');
  R(g, X(40), 52, 19, 2, 'ink.0'); R(g, X(40), 52, 19, 1, '#8a6040');
  const books = [['red.1', 6], ['cyan.1', 5], ['gold.1', 7], ['indigo.2', 5], ['green.1', 6], ['red.2', 4], ['slate.3', 6]];
  let bx = X(41);
  for (const [cc, hh] of books) { R(g, bx, 52 - hh, 2, hh, cc); R(g, bx, 52 - hh, 2, 1, 'ink.0'); bx += 2; }
  R(g, X(55), 48, 3, 4, '#8a6040'); R(g, X(54), 45, 2, 3, 'green.2'); R(g, X(56), 44, 2, 4, 'green.3');

  // the desk, the monitor (its screen is drawn live), the lamp, the chair
  R(g, X(37), 72, 24, 3, 'ink.0');
  R(g, X(38), 72, 22, 2, '#8a6040'); R(g, X(38), 72, 22, 1, '#a37850');
  for (const lx of [X(38), X(58)]) { R(g, lx - 1, 74, 4, 8, 'ink.0'); R(g, lx, 74, 2, 8, '#6b4529'); }
  box(g, X(50), 75, 8, 4, '#6b4529', '#7a5536'); R(g, X(53), 77, 2, 1, '#c58c52');
  box(g, X(42), 61, 13, 10, '#1b1d2a');
  R(g, X(47), 71, 3, 2, 'ink.0'); R(g, X(45), 71, 7, 1, 'ink.0');
  R(g, X(40), 71, 7, 1, 'slate.2');                             // keyboard
  R(g, X(57), 70, 4, 2, 'ink.0'); R(g, X(58), 64, 1, 6, 'ink.0'); R(g, X(56), 63, 4, 2, 'ink.0');
  R(g, X(56), 65, 3, 1, '#ffe08a');
  g.fillStyle = 'rgba(255,224,138,0.10)'; g.beginPath(); g.moveTo(X(56), 66); g.lineTo(X(52), 72); g.lineTo(X(61), 72); g.lineTo(X(59), 66); g.fill();
}

// his desk chair; it turns with him (the back is behind him)
function chair(ctx, x, facing) {
  const back = facing > 0 ? x - 5 : x + 3;
  R(ctx, back, 67, 3, 13, 'ink.0'); R(ctx, back + 1, 68, 1, 11, 'slate.2');
  R(ctx, x - 5, 77, 11, 3, 'ink.0'); R(ctx, x - 4, 78, 9, 1, 'slate.2');
  R(ctx, x - 1, 80, 2, 2, 'ink.0'); R(ctx, x - 4, 81, 8, 1, 'ink.0');
}

// the monitor's screen: lines of code (bars, never glyphs), the last one
// growing while he types
const CODE = [[0, 5, 'teal.3'], [2, 4, 'cyan.2'], [2, 6, 'gold.2'], [0, 3, 'slate.3']];
function screen(ctx, X, n) {
  R(ctx, X(43), 62, 11, 8, '#0f2a3a');
  CODE.forEach(([ind, len, c], i) => {
    const l = i === CODE.length - 1 ? Math.min(len, n) : len;
    if (l > 0) R(ctx, X(44 + ind), 63 + i * 2, l, 1, c);
  });
}

// the black pack: on the floor, or in his hands
function bag(ctx, x, y) {
  R(ctx, x - 1, y + 1, 9, 8, 'slate.3'); R(ctx, x, y, 7, 10, 'slate.3'); R(ctx, x + 1, y - 2, 5, 2, 'slate.3');
  R(ctx, x, y + 1, 7, 8, 'ink.0'); R(ctx, x + 1, y, 5, 1, 'ink.0');
  R(ctx, x + 1, y + 1, 5, 7, '#1a1b23');
  R(ctx, x + 1, y + 1, 5, 1, '#2f313d'); R(ctx, x + 1, y + 2, 1, 5, '#2f313d');
  R(ctx, x + 2, y + 5, 4, 1, 'ink.0');
  R(ctx, x + 5, y + 4, 1, 1, 'teal.2');
  R(ctx, x + 2, y - 1, 3, 1, 'ink.0');
}

// ─── the move to Vincio (T0) ──────────────────────────────────────────

// the clips' thumbnails: a little footage in each (sky, land, light)
const FOOT = [['#f2a65a', '#7c3f4f', '#ffe08a'], ['#63b8de', '#1f5f6e', '#e3f6ff'], ['#5b4fa8', '#221c45', '#ffd27a']];
function clip(ctx, x, y, w, s, lit, ch = 8) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = INK;
  ctx.fillRect(x, y - 1, w, ch + 2); ctx.fillRect(x - 1, y, w + 2, ch);
  R(ctx, x, y, w, ch, 'cyan.1');
  R(ctx, x, y, w, 2, lit ? 'cyan.3' : 'cyan.2');
  R(ctx, x, y + ch - 1, w, 1, 'cyan.0');
  const [skyC, land, light] = FOOT[s % FOOT.length];
  const th = ch - 5;
  for (let fx = x + 2; fx + 6 <= x + w - 1; fx += 7) {
    R(ctx, fx - 1, y + 3, 7, th + 1, 'ink.0');
    R(ctx, fx, y + 3, 5, th, skyC);
    R(ctx, fx, y + 2 + th, 5, 1, land); if (th > 2) R(ctx, fx + 1 + (s % 2), y + 1 + th, 2, 1, land);
    R(ctx, fx + 3, y + 3, 1, 1, light);
  }
}

// where he is at s along T0, and how he looks
function t0At(b, s, dir = 1, still = false) {
  const { pts } = b;
  s = clamp(s, 0, 1);
  // hop off the ledge: up and out over the edge
  if (s < 0.1) {
    const u = s / 0.1;
    const x = lerp(pts.start[0], pts.apex[0], u), y = lerp(0, pts.apex[1], 1 - (1 - u) * (1 - u));
    if (u < 0.15 && !still) return { x, y, pose: 'crouch', frame: 0, facing: b.d * dir };
    return { x, y, pose: dir > 0 ? 'jump' : 'fall', frame: 0, facing: b.d * dir };
  }
  // fall through the wisp onto the first clip
  if (s < 0.4) {
    const u = (s - 0.1) / 0.3, [ax, ay] = pts.apex, [cx, cy] = pts.clips[0];
    return { x: lerp(ax, cx, u), y: ay + (cy - ay) * u * u, pose: dir > 0 ? 'fall' : 'jump', frame: 0, facing: Math.sign(cx - ax || b.d) * dir };
  }
  // three hops: clip 1 → 2 → 3 → the next stop's entrance
  const i = Math.min(2, Math.floor((s - 0.4) / 0.2));
  const a = 0.4 + i * 0.2, u = (s - a) / 0.2;
  const [x0, y0] = pts.clips[i], [x1, y1] = i < 2 ? pts.clips[i + 1] : pts.end;
  const face = Math.sign(x1 - x0 || 1) * dir;
  if (u < 0.18) return { x: x0, y: y0, pose: still ? 'idle' : 'crouch', frame: 0, facing: face };
  const v = (u - 0.18) / 0.82, H = 6;
  const x = lerp(x0, x1, v), y = lerp(y0, y1, v) - H * 4 * v * (1 - v);
  const vy = ((y1 - y0) - H * 4 * (1 - 2 * v)) * dir;
  if (s >= 1) return { x: x1, y: y1, pose: 'idle', frame: 0, facing: face };
  return { x, y, pose: vy < 0 ? 'jump' : 'fall', frame: 0, facing: face };
}

const T0 = {
  build({ w, h, from = [w / 2, 0], to = [w / 2, h], side = 0, lane = 0 }) {
    const cx = w / 2;
    // the clips step side to side inside the lane (the card's side kept clear)
    const o = lane ? clamp(lane - 8, 6, 12) : 7;
    const d = side ? -side : from[0] > cx ? -1 : 1;            // the first hop crosses the centre
    const shift = side ? -side * 4 : 0;
    // On desktop (a lane) the gap is open down the middle, so the clips
    // step down through it. On phones and tablets the snapshot covers the
    // centre just under the intro scene, above the track, so they sit in
    // the last 21 px above Vincio and he falls behind the snapshot first,
    // as he passes behind cards.
    const ys = lane ? [0.46, 0.66, 0.85].map((k) => Math.round(h * k)) : [0, 7, 14].map((dy) => Math.max(12, h - 21) + dy);
    const clips = [[cx + d * o + shift, ys[0]], [cx - d * o + shift, ys[1]], [cx + d * o * 0.6 + shift, ys[2]]]
      .map(([x, y]) => [Math.round(x), y]);
    const start = from, apex = [from[0] + d * 5, -5];
    const pts = { start, apex, clips, end: to };
    const b = { w, h, d, pts, cw: 18, ch: 6 };
    // the wisp, where his fall passes it (just under the ledge on phones)
    const yw = lane ? Math.round(clips[0][1] * 0.42) : Math.min(7, Math.round((clips[0][1] - 4) * 0.5));
    const uw = Math.sqrt(clamp((yw - apex[1]) / (clips[0][1] - apex[1]), 0, 1));
    b.wisp = [Math.round(lerp(apex[0], clips[0][0], uw)), yw];
    // the dotted line along his flight, and its length at each step
    const N = 90, trail = [], at = [0];
    for (let i = 0; i <= N; i++) { const p = t0At(b, i / N); trail.push([p.x, p.y]); if (i) at.push(at[i - 1] + Math.hypot(p.x - trail[i - 1][0], p.y - trail[i - 1][1])); }
    b.line = trail; b.at = at;
    b.landAt = [0.4, 0.6, 0.8];
    return b;
  },

  draw(ctx, g, b) {
    const s = g.reduced ? 1 : g.s;
    const here = !g.reduced && g.s > 0 && g.s < 1;
    const hy = here ? t0At(b, g.s).y : -99;
    // the wisp: two halves that part around him as he falls through
    const [wx, wy] = b.wisp;
    const part = here ? Math.round(3 * clamp(1 - Math.abs(hy - 13 - wy) / 14, 0, 1)) : 0;
    cloud(ctx, wx - 5 - part, wy, 10, 5);
    cloud(ctx, wx + 6 + part, wy + 1, 12, 6);
    // the path along his flight
    const k = s * (b.line.length - 1), i = Math.floor(k);
    const done = g.reduced ? Infinity : b.at[Math.min(i, b.at.length - 1)] + (i < b.at.length - 1 ? (b.at[i + 1] - b.at[i]) * (k - i) : 0);
    drawPath(ctx, b.line, { done });
    // the start ledge, then the clips (each dips as he lands on it)
    const [fx] = b.pts.start;
    ledge(ctx, b.d > 0 ? fx - 10 : fx - 3, 0, 13, 'steel');
    b.pts.clips.forEach(([x, y], n) => {
      const on = here && g.s >= b.landAt[n] && g.s < b.landAt[n] + 0.036;
      clip(ctx, x - b.cw / 2, y + (on ? 1 : 0), b.cw, n, g.reduced || g.s >= b.landAt[n], b.ch);
    });
  },

  hero(g, b) {
    const p = t0At(b, g.s, g.dir, g.still);
    return { pose: p.pose, frame: 0, x: p.x, y: p.y, facing: p.facing || 1 };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'intro',
  facts: ['p-name', 'c-email', 'c-linkedin', 'c-github', 'c-open'],
  split: [0.1, 0.2, 0.85],                   // the page opens at hold 0.5 (p 0.525)
  idle: true,
  poses,

  build({ w, h }) {
    const x0 = coreX(w), X = (v) => x0 + v;
    const r = rng(7);
    const stars = [];
    for (let i = 0; i < 40 && stars.length < 22; i++) {
      const x = Math.floor(r() * w), y = 2 + Math.floor(r() * 60);
      const inHouse = x > X(ROOM.l - 8) && x < X(ROOM.r + 8) && y > ROOM.top - 26;
      const nearMoon = Math.abs(x - X(134)) < 10 && Math.abs(y - 19) < 10;
      if (!inHouse && !nearMoon) stars.push({ x, y, b: r(), ph: Math.floor(r() * 8) });
    }
    return {
      back: paintBack(w, h), X, stars,
      out: [[X(DOOR), FLOOR], [X(EDGE), FLOOR], [X(DROP), h]],
      route: {
        enter: [X(82), 0], via: [[X(82), FLOOR]], act: [X(DOOR), FLOOR],
        leave: [[X(EDGE), FLOOR]], exit: [X(DROP), h],
      },
    };
  },

  draw(ctx, f, b) {
    const { X } = b;
    ctx.drawImage(b.back, 0, 0);
    // stars: a few blink while he idles (≤ 8 fps)
    const tick = f.t ? Math.floor(f.t / 125) : 0;
    for (const s of b.stars) {
      if (s.b < 0.3 && tick && (tick + s.ph * 5) % 40 < 3) continue;
      R(ctx, s.x, s.y, 1, 1, s.b > 0.85 ? '#fbf8f1' : s.b > 0.5 ? '#a8b4d8' : '#5d6a9a');
    }
    const { k } = story(f);
    const st = leave(k);
    const home = f.phase === 'act' || f.phase === 'hold';
    // the screen; its last line grows while he types
    const typing = home && st.step === 'sit' && !f.reduced;
    screen(ctx, X, typing ? Math.floor(f.t / 250) % 8 : 3);
    if (home && st.bag === 'floor') bag(ctx, X(PACK), 73);
    const sitting = home && st.step === 'sit';
    chair(ctx, X(CHAIR), sitting ? this.hero(f, b).facing : 1);
    // the path: from his door, off the ledge
    const outLen = (EDGE - DOOR) + (b.h - FLOOR);
    const done = f.reduced || f.phase === 'after' ? Infinity : f.phase === 'out' ? f.walk * outLen : -1;
    drawPath(ctx, b.out, { done });
    f.drawHero();
    if (home && st.bag === 'hand') {
      const p = this.hero(f, b);
      const [hx, hy] = handAt(p.pose, p.frame, p.facing, poses());
      bag(ctx, Math.round(p.x + hx) - (p.facing > 0 ? 2 : 4), Math.round(p.y + hy) - 3);
    }
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    const { X } = b;
    const { k, run } = story(f);
    const st = leave(k);
    const fwd = run * f.dir;                 // +1: playing towards the door
    const y = FLOOR;
    if (st.step === 'sit') {
      if (f.phase === 'hold') return { facing: 1, ...seated(f), x: X(CHAIR), y };
      return { pose: 'sitType', frame: 0, x: X(CHAIR), y, facing: 1 };
    }
    const at = { x: X(st.x), y, facing: 1 };
    if (st.step === 'up') return { ...at, pose: k < 0.1 ? 'crouchNP' : 'standNP', frame: 0 };
    if (st.step === 'walk') {
      const d = Math.abs(st.x - CHAIR);
      return { ...at, pose: f.still ? 'standNP' : 'runNP', frame: Math.floor(d / 5) % 4, facing: fwd };
    }
    if (st.step === 'reach') return { ...at, pose: 'crouchNP', frame: 0 };
    if (st.step === 'carry') return { ...at, pose: 'carryNP', frame: 0 };
    if (st.step === 'on') return { ...at, pose: 'idle', frame: 0 };
    const d = Math.abs(st.x - GRAB);
    if (k >= 1) return { ...at, pose: 'idle', frame: 0, facing: 1 };
    return { ...at, pose: f.still ? 'idle' : 'run', frame: Math.floor(d / 5) % 4, facing: fwd };
  },

  transit: T0,
};

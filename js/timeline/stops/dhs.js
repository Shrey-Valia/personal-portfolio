// Dublin High School (Dublin, CA · Aug 2021 – Jun 2025). Late dusk: the
// sun has gone down behind the golden Tri-Valley hills and only the glow
// is left. Navy-trimmed stucco wings, a red covered walkway over the blue
// lockers, and the commencement stage under a red, white and navy
// balloon arch with its "Class of 2025" banner (an HTML label). He walks
// onto the stage, a navy mortarboard pops onto his head, he raises his
// diploma, and four caps toss up and tumble down onto the stage lip.
//
// transit (T6, down to EduLearn): he hangs from a black cable running
// diagonally down to the giant laptop's port. The "2024" year marker
// beside it is the page's own HTML.
//
// Scene plan: docs/TIMELINE-SCENES.md §1 Stop 7 and §2 T6.
// Contract: docs/BUILDING-STOPS.md. Art copied from js/themes/dhs.js.

import { drawPath, routeDone, routePoints, sky, fadeEdges, coreX, handAt } from '../kit.js';
import { col } from '../../art/palette.js';
import { line, disc, noise1 } from '../../art/draw.js';
import { makeCanvas, ease, clamp, lerp, rng } from '../../engine/util.js';

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

const STAGE = 72;               // the stage floor (his mark)
const GROUND = 86;              // the concrete walkway

const K = {
  slabHi: col('#d8c6a2'), slab: col('#bfae8c'), slabLo: col('#a39070'), curb: col('#5b4634'), soil: col('#2e2420'), soil2: col('#241c1a'),
  wall: col('#a47862'), wall2: col('#946c58'), wallLo: col('#7e5a4c'), coping: col('#c4a888'),
  trim: col('#2b3a7a'), trimHi: col('#4a5cab'), trimLo: col('#1d2656'),
  can: col('#b8323a'), canHi: col('#e0574f'), canLo: col('#7e1f28'),
  glass: col('#2a4656'), glint: col('#f2b26a'), ink: col('ink.0'), post: col('#7c8a92'), postLo: col('#55616a'),
  lock: col('indigo.2'), lockHi: col('indigo.3'), lockLo: col('indigo.1'), lockDark: col('indigo.0'), plate: col('#c9ced8'),
  lip: col('#c98a45'), lipHi: col('#f4c98a'), skirt: col('#232a5c'), pleat: col('#1a1f48'), drape: col('#2f3874'), white: col('#fbf8f1'),
  board: col('#4a5490'), board2: col('#2f3560'), skull: col('#1c2036'), skullHi: col('#2b3150'),
  tassel: col('red.2'), knot: col('red.3'), paper: col('white.1'), paperHi: col('white.2'),
};

// ─── the backdrop, drawn once per width ───────────────────────────────

function backdrop(b, w, h, cx, c) {
  // late dusk: no sun disc, just the glow it left behind the hills
  sky(b, w, 62, ['#232e66', '#3e3f7c', '#6a4f86', '#a2617f', '#c97a6c']);
  const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const cy = 14 + Math.floor(r() * 34), x = Math.floor(r() * w) - 20, cw = 20 + Math.floor(r() * 40);
    rect(b, x, cy, cw, 1, col(cy < 30 ? '#4f4a86' : '#9a6488'));
    rect(b, x + 4, cy + 1, cw - 10, 1, col(cy < 30 ? '#6a5a92' : '#c47e84'));
  }
  // the golden Tri-Valley hills, two layers, oaks dotting the near one
  const layers = [{ base: 54, amp: 9, freq: 0.03, c: '#b07e48', seed: 4 }, { base: 61, amp: 5, freq: 0.05, c: '#8c6236', seed: 9, oaks: true }];
  for (const L of layers) {
    const n = noise1(L.seed), ys = [];
    for (let x = 0; x < w; x++) {
      const y = Math.round(L.base - n(x * L.freq) * L.amp);
      ys.push(y);
      rect(b, x, y, 1, GROUND - y, col(L.c));
      rect(b, x, y, 1, 1, col(L.oaks ? '#a8783e' : '#c8955a'));
    }
    if (L.oaks) {
      const q = rng(13);
      for (let i = 0; i < w / 14; i++) {
        const x = Math.floor(q() * (w - 6)) + 3, y = ys[x] + 2 + Math.floor(q() * 4);
        disc(b, x, y, 2, '#5a4a26');
        rect(b, x - 1, y - 2, 2, 1, col('#7a6a34'));
      }
    }
  }
  // the lawn, and a far hedge line in front of the hills
  rect(b, 0, 66, w, GROUND - 66, col('#4e4a26'));
  rect(b, 0, 66, w, 1, col('#6a6430'));
  for (let x = 0; x < w; x += 5) rect(b, x + 1, 66, 2, 1, col('#5e5a2c'));

  wing(b, cx - 44, 66, 40, true);              // left: classrooms, the canopy, the lockers
  wing(b, cx + 140, 64, 48, false);             // right: another wing past the stage
  palm(b, cx + 150, 40);
  palm(b, cx + 10, 34);

  // the concrete walkway everyone stands on
  rect(b, 0, GROUND, w, 1, K.slabHi);
  rect(b, 0, GROUND + 1, w, 4, K.slab);
  rect(b, 0, GROUND + 5, w, 1, K.slabLo);
  for (let x = 2; x < w; x += 16) rect(b, x, GROUND + 1, 1, 4, K.slabLo);
  rect(b, 0, GROUND + 6, w, 1, K.curb);
  rect(b, 0, GROUND + 7, w, h - GROUND - 7, K.soil);
  const s = rng(21);
  for (let i = 0; i < w / 4; i++) rect(b, Math.floor(s() * w), GROUND + 8 + Math.floor(s() * 5), 1, 1, K.soil2);

}

// a stucco classroom wing with navy trim; the left one has the red
// covered walkway and the royal-blue lockers under it
function wing(b, x, w, top, lockers) {
  const base = GROUND;
  rect(b, x, top - 26, w, base - top + 26, K.wall);
  rect(b, x + w - 4, top - 26, 4, base - top + 26, K.wallLo);
  rect(b, x - 2, top - 30, w + 4, 2, K.coping);
  rect(b, x - 2, top - 28, w + 4, 3, K.trim);
  rect(b, x - 2, top - 28, w + 4, 1, K.trimHi);
  rect(b, x - 2, top - 25, w + 4, 1, K.trimLo);
  for (let wx = x + 4; wx < x + w - 9; wx += 10) {
    rect(b, wx, top - 20, 7, 8, K.trimLo);
    rect(b, wx + 1, top - 19, 5, 6, K.glass);
    rect(b, wx + 1, top - 19, 2, 1, K.glint);
    rect(b, wx, top - 12, 7, 1, K.coping);
  }
  if (!lockers) {
    for (let wx = x + 4; wx < x + w - 9; wx += 10) { rect(b, wx, top - 4, 7, 8, K.trimLo); rect(b, wx + 1, top - 3, 5, 6, K.glass); }
    return;
  }
  // lockers: five doors with vents, number plates and a latch
  for (let i = 0; i < 5; i++) {
    const lx = x + 3 + i * 7;
    rect(b, lx, top - 6, 7, base - top + 6, K.lock);
    rect(b, lx, top - 6, 7, 1, K.lockHi);
    rect(b, lx + 6, top - 6, 1, base - top + 6, K.lockDark);
    for (let v = 0; v < 3; v++) rect(b, lx + 2, top - 3 + v * 2, 3, 1, K.lockLo);
    rect(b, lx + 2, top + 4, 3, 1, K.plate);
    rect(b, lx + 5, top + 8, 1, 3, K.plate);
  }
  // the red covered walkway: corrugated metal on slim grey posts
  const cy = top - 10, cw = w + 18;
  for (const px of [x + 1, x + cw - 4]) { rect(b, px, cy + 5, 2, base - cy - 5, K.post); rect(b, px + 1, cy + 5, 1, base - cy - 5, K.postLo); }
  rect(b, x - 2, cy - 1, cw + 2, 7, K.ink);
  rect(b, x - 1, cy, cw, 1, K.canHi);
  rect(b, x - 1, cy + 1, cw, 3, K.can);
  for (let i = x; i < x + cw - 1; i += 4) rect(b, i, cy + 1, 1, 3, K.canLo);
  rect(b, x - 1, cy + 4, cw, 1, K.canLo);
}

function palm(b, x, hgt) {
  for (let i = 0; i < hgt; i++) {
    const bend = Math.round(Math.sin((i / hgt) * 1.6) * 3);
    rect(b, x + bend, GROUND - i, 2, 1, col(i % 4 === 0 ? '#3e3028' : '#54423a'));
  }
  const cx = x + 4, cy = GROUND - hgt;
  for (const [dx, dy] of [[-10, 4], [-8, -3], [-3, -6], [4, -6], [9, -3], [11, 4], [6, 7], [-6, 7]]) {
    line(b, cx, cy, cx + dx, cy + dy, '#2e3820');
    line(b, cx, cy + 1, cx + dx, cy + dy + 1, '#232b19');
  }
}

// the commencement stage: balloon arch and banner behind, skirt in front
const ARCH = { rx: 47, ry: 52 };
function stageBack(b, c) {
  const ay = STAGE - 2;
  for (let i = 0; i <= 22; i++) {
    const a = Math.PI * (i / 22);
    const bx = c - Math.cos(a) * ARCH.rx, by = ay - Math.sin(a) * ARCH.ry;
    disc(b, bx, by, 4, 'ink.0');
    const k = i % 3;
    disc(b, bx, by, 3, k === 0 ? 'red.2' : k === 1 ? 'white.1' : 'indigo.2');
    rect(b, bx - 1, by - 2, 1, 1, k === 0 ? col('red.3') : k === 1 ? col('white.2') : col('indigo.3'));
  }
  // the red banner hung under the top of the arch (its words are an HTML label)
  const bw = 68, by = ay - ARCH.ry + 6;
  rect(b, c - 25, by - 3, 1, 3, K.ink); rect(b, c + 24, by - 3, 1, 3, K.ink);
  rect(b, c - bw / 2 - 1, by - 1, bw + 2, 15, K.ink);
  rect(b, c - bw / 2, by, bw, 13, K.can);
  rect(b, c - bw / 2, by, bw, 1, K.canHi);
  rect(b, c - bw / 2, by + 12, bw, 1, K.canLo);
  rect(b, c - bw / 2 + 2, by + 2, bw - 4, 1, K.white);
  rect(b, c - bw / 2 + 2, by + 10, bw - 4, 1, K.white);
}
const STAGE_W = 104;
function stageFront(b, c, h) {
  const x = c - STAGE_W / 2, w = STAGE_W, top = STAGE;
  rect(b, x - 1, top - 1, w + 2, GROUND - top + 2, K.ink);
  rect(b, x, top, w, 4, K.lip); rect(b, x, top, w, 1, K.lipHi);
  rect(b, x, top + 4, w, GROUND - top - 4, K.skirt);
  for (let i = 4; i < w; i += 6) rect(b, x + i, top + 6, 2, GROUND - top - 6, K.pleat);
  for (let i = 0; i < w; i += 12) for (let j = 0; j < 5; j++) rect(b, x + i + j, top + 6 + j, 12 - j * 2, 1, K.drape);
  rect(b, x, top + 4, w, 1, K.white); rect(b, x, top + 5, w, 1, K.can);
}

// ─── mortarboards ─────────────────────────────────────────────────────

// a tossed cap: the board is a square seen from slightly above (a flat
// diamond); k squashes it mid-spin and turns it over below 0. (x, y) is
// the top of the board; it rests with its skull 7 px lower.
function tossedCap(ctx, cx, y, k, swing) {
  cx = Math.round(cx); y = Math.round(y);
  const s = Math.abs(k), under = k < 0;
  const widths = [4, 10, 14, 10, 4].map((v) => Math.max(2, Math.round(v * s)));
  const rows = under ? widths.slice().reverse() : widths;
  const skull = (yy) => { rect(ctx, cx - 5, yy - 1, 10, 5, K.ink); rect(ctx, cx - 4, yy, 8, 3, K.skull); rect(ctx, cx - 4, yy, 8, 1, K.skullHi); };
  if (under) skull(y - 4);
  rows.forEach((v, i) => rect(ctx, cx - v / 2 - 1, y + i - 1, v + 2, 3, K.ink));
  rows.forEach((v, i) => rect(ctx, cx - v / 2, y + i, v, 1, i < 2 ? K.board : K.board2));
  if (!under) skull(y + 5);
  rect(ctx, cx - 1, y + 1, 2, 1, K.knot);
  const tx = cx + Math.round(6 * s);
  rect(ctx, cx, y + 2, Math.max(0, tx - cx), 1, K.tassel);
  rect(ctx, tx + swing, y + 3, 1, 4, K.tassel);
  rect(ctx, tx + swing - 1, y + 6, 3, 2, K.knot);
}

// his own cap, on his head (feet at x, y); drop lifts it off for the pop
function wornCap(ctx, x, y, facing, drop = 0) {
  const t = Math.round(y - 27 - drop), f = facing;
  const L = f > 0 ? x - 5 : x - 6;                         // the head's left edge, mirrored
  rect(ctx, L + 1, t + 2, 10, 4, K.ink);                    // skull band over his hair
  rect(ctx, L + 2, t + 3, 8, 2, K.skull);
  rect(ctx, L - 1, t - 1, 14, 3, K.ink);                    // the board, edge-on
  rect(ctx, L, t, 12, 1, K.board);
  rect(ctx, L + 3, t - 1, 6, 1, K.board);
  rect(ctx, L, t + 1, 12, 1, K.board2);
  const fx = f > 0 ? L + 11 : L;                            // the tassel off the front corner
  rect(ctx, L + 5, t, 2, 1, K.knot);
  rect(ctx, fx, t + 2, 1, 4, K.tassel);
  rect(ctx, fx - (f > 0 ? 0 : 1), t + 6, 2, 2, K.knot);
}

// the diploma: a rolled scroll tied with a red ribbon, centred on his hand
function diploma(ctx, hx, hy) {
  const x = Math.round(hx - 4), y = Math.round(hy - 2);
  rect(ctx, x - 1, y - 1, 10, 5, K.ink);
  rect(ctx, x, y, 8, 3, K.paper);
  rect(ctx, x, y, 8, 1, K.paperHi);
  rect(ctx, x + 3, y, 2, 3, K.tassel);
  rect(ctx, x + 4, y + 3, 1, 2, K.tassel);
}

// ─── the beat, as a function of f.act ─────────────────────────────────

const POP = [0.02, 0.18];       // the cap pops onto his head
const HOLD_IT = 0.2, RAISE = 0.3;
const TOSS = { start: 0.38, step: 0.06, dur: 0.38 };

// where he is, so the cap and diploma follow him: his mark in act and
// hold; walking out, the engine walks him right and drops him like this
function heroAt(f, b) {
  if (!f.here || f.phase === 'in') return null;
  const [ax, ay] = b.route.act;
  if (f.phase !== 'out') {
    const pose = f.phase === 'act' && f.act < HOLD_IT ? 'idle' : f.phase === 'act' && f.act < RAISE ? 'carry' : 'lift';
    return { x: ax, y: ay, facing: 1, pose, frame: 0 };
  }
  const lx = b.route.leave[0][0], L1 = Math.abs(lx - ax), L2 = b.h - ay;
  const d = f.walk * (L1 + L2), facing = (lx > ax ? 1 : -1) * f.dir;
  if (d <= L1) return { x: ax + Math.sign(lx - ax) * d, y: ay, facing, pose: f.still ? 'idle' : 'run', frame: Math.floor(d / 5) % 4 };
  const u = (d - L1) / L2;
  return { x: lx, y: ay + L2 * u * u, facing, pose: f.dir < 0 || u < 0.12 ? 'jump' : 'fall', frame: 0 };
}

// ─── T6: a black cable down to the laptop's port ──────────────────────

const CABLE = { ink: col('ink.0'), hi: col('steel.3'), pulse: col('cyan.3'), plug: col('#9aa0ad'), plugHi: col('#c9ced8'), lid: col('#2a2d36'), lidHi: col('#4a4f5e') };

const T6 = {
  build({ w, h, from = [Math.round(w / 2), 0], to = [Math.round(w / 2), h], side = 0 }) {
    const fd = side ? -side : -1;                                   // he rides toward the free side
    const fx = from[0], tx = to[0];
    const [hdx, hdy] = handAt('hang', 0, fd);                       // his hands, from his feet
    const A = [fx + hdx, 2];                                        // he catches the cable here
    const P = [Math.round(w / 2 + fd * (w / 2 - 8)), h - 7];        // the port, out on the free side
    // the cable runs on up out of view along the same line
    const run = (P[0] - A[0]) / Math.max(1, P[1] - A[1]);
    const top = [A[0] - run * (A[1] + 2), -2];
    const ey = Math.max(A[1], h - 8 + hdy);
    const k = P[1] === A[1] ? 0 : (ey - A[1]) / (P[1] - A[1]);
    const E = [lerp(A[0], P[0], k), ey];                            // where he lets go
    const feetA = [A[0] - hdx, A[1] - hdy], feetE = [E[0] - hdx, E[1] - hdy];
    const L0 = Math.hypot(feetA[0] - fx, feetA[1]), L1 = Math.hypot(E[0] - A[0], E[1] - A[1]), L2 = Math.hypot(tx - feetE[0], h - feetE[1]);
    const L = Math.max(1, L0 + L1 + L2);
    return { fd, A, P, E, top, feetA, feetE, from, to, sA: L0 / L, sB: (L0 + L1) / L, hd: [hdx, hdy] };
  },

  draw(ctx, g, b) {
    const { A, P, top } = b;
    // the cable: black, two pixels wide with a faint top light so it reads on the navy page
    line(ctx, top[0], top[1], P[0], P[1] - 6, CABLE.ink); line(ctx, top[0] + 1, top[1], P[0] + 1, P[1] - 6, CABLE.ink);
    line(ctx, top[0] - 1, top[1] + 1, P[0] - 1, P[1] - 5, CABLE.hi);
    // data running down it into the laptop, ahead of him (with the scroll)
    if (!g.reduced) {
      for (let i = 0; i < 4; i++) {
        const u = (((g.s * 2.5 + i / 4) % 1) + 1) % 1;
        const x = lerp(A[0], P[0], u), y = lerp(A[1], P[1] - 6, u);
        rect(ctx, x, y, 2, 2, CABLE.pulse);
      }
    }
    // the plug going into the port on the laptop's edge
    rect(ctx, P[0] - 9, P[1] + 1, 19, 6, CABLE.ink);
    rect(ctx, P[0] - 8, P[1] + 2, 17, 5, CABLE.lid);
    rect(ctx, P[0] - 8, P[1] + 2, 17, 1, CABLE.lidHi);
    rect(ctx, P[0] - 3, P[1] + 3, 7, 3, CABLE.ink);
    rect(ctx, P[0] - 2, P[1] - 6, 5, 9, CABLE.ink);
    rect(ctx, P[0] - 1, P[1] - 5, 3, 8, CABLE.plug);
    rect(ctx, P[0] - 1, P[1] - 5, 1, 8, CABLE.plugHi);
  },

  hero(g, b) {
    const s = clamp(g.s, 0, 1), { fd, A, E, feetA, feetE, from, to, sA, sB, hd } = b;
    if (s <= sA) {
      const u = sA > 0 ? s / sA : 1;
      return { pose: 'hang', frame: 0, x: lerp(from[0], feetA[0], u), y: lerp(from[1], feetA[1], u), facing: fd };
    }
    if (s <= sB) {
      const u = sB > sA ? (s - sA) / (sB - sA) : 1;
      return { pose: 'hang', frame: 0, x: lerp(A[0], E[0], u) - hd[0], y: lerp(A[1], E[1], u) - hd[1], facing: fd };
    }
    // let go, and hop across into the scene below
    const u = (s - sB) / Math.max(1e-6, 1 - sB);
    const dy = to[1] - feetE[1], lift = 8;
    const rising = (dy - lift * Math.PI * Math.cos(Math.PI * u)) * g.dir < 0;
    const facing = (to[0] >= feetE[0] ? 1 : -1) * g.dir;
    return { pose: rising ? 'jump' : 'fall', frame: 0, x: lerp(feetE[0], to[0], u), y: lerp(feetE[1], to[1], u) - Math.sin(Math.PI * u) * lift, facing };
  },
};

// ─── the stop ─────────────────────────────────────────────────────────

export default {
  id: 'dhs',
  facts: ['e-dhs'],

  build({ w, h, el }) {
    const cx = coreX(w), c = Math.round(w / 2);
    // the banner's year is the diploma's, read from the card's last date
    const times = el ? [...el.querySelectorAll('time[datetime]')] : [];
    const year = times.length ? times[times.length - 1].getAttribute('datetime').slice(0, 4) : '2025';
    const [back, b] = makeCanvas(w, h);
    backdrop(b, w, h, cx, c);
    const [front, fr] = makeCanvas(w, h);
    stageFront(fr, c, h);
    const [arch, ar] = makeCanvas(w, h);
    stageBack(ar, c);
    // four caps tossed from below the stage, landing on its lip either side of him
    const r = rng(2025);
    const caps = [-40, -26, 25, 39].map((dx, i) => ({
      xs: c + dx * 0.5 + (r() - 0.5) * 24, xe: c + dx, lift: 54 + Math.round(r() * 10),
      a: TOSS.start + i * TOSS.step, spins: 2 + (i % 2), swing: i % 2 ? 1 : -1,
    }));
    return {
      back, front, arch, caps, c, banner: `Class of ${year}`,
      route: { enter: [c, 0], via: [[c - 30, STAGE]], act: [c, STAGE], leave: [[c + 6, STAGE]], exit: [c + 6, h] },
    };
  },

  draw(ctx, f, b) {
    ctx.drawImage(b.back, 0, 0);
    ctx.drawImage(b.front, 0, 0);
    drawPath(ctx, routePoints(b.route), { done: routeDone(b.route, f) });
    ctx.drawImage(b.arch, 0, 0);                    // the banner hides the dots where he drops in
    const me = heroAt(f, b);
    f.drawHero();
    // his cap pops on, then the diploma goes up in his hand
    if (me) {
      const pop = f.phase === 'act' ? clamp((f.act - POP[0]) / (POP[1] - POP[0]), 0, 1) : 1;
      if (pop > 0) wornCap(ctx, me.x, me.y, me.facing, Math.round((1 - ease.outBack(pop)) * 12));
      if (f.phase !== 'act' || f.act >= HOLD_IT) {
        const [hx, hy] = handAt(me.pose, me.frame, me.facing);
        diploma(ctx, me.x + hx, me.y + hy);
      }
    }
    // the classmates' caps: up from below the stage, tumbling, down onto its lip
    for (const cp of b.caps) {
      const u = f.phase === 'before' || f.phase === 'in' ? 0 : f.phase === 'act' ? clamp((f.act - cp.a) / TOSS.dur, 0, 1) : 1;
      if (u <= 0) continue;
      const rest = STAGE - 7;
      const x = lerp(cp.xs, cp.xe, u), y = lerp(104, rest, u) - 4 * cp.lift * u * (1 - u);
      const k = u >= 1 ? 1 : Math.cos(u * Math.PI * 2 * cp.spins);
      tossedCap(ctx, x, y, k, u >= 1 ? 0 : Math.round(Math.sin(u * 14) * 1.5) * cp.swing);
    }
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, b) {
    const pose = f.phase === 'act' && f.act < HOLD_IT ? 'idle' : f.phase === 'act' && f.act < RAISE ? 'carry' : 'lift';
    return { pose, frame: 0, x: b.route.act[0], y: STAGE, facing: 1 };
  },

  labels(f, b) {
    return [{ text: b.banner, x: b.c, y: STAGE - 2 - ARCH.ry + 7 }];
  },

  transit: T6,
};

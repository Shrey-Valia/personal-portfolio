// Oak Ridge National Laboratory (Jan–May 2026). The cage lift sets him
// down on a catwalk in the lab. In the web tool's window the design
// sliders rise from the target properties (inverse design), he presses
// Run, the run bar fills while four GPU racks blink in lockstep, and the
// monomer beads jittering in the pit snap into a bonded chain (the GNNs
// model self-assembly). He leaves by sliding down the chain.
// The transit is T2: four gold slider knobs drop to their values as he
// nears each one, forming the steps down to Handshake.
// Scene plan: docs/TIMELINE-SCENES.md. Contract: docs/BUILDING-STOPS.md.
//
// Drawing code is copied from js/game/setpieces.js (Assembly, RunBar,
// Browsers, Sliders, Lifts' racks) and js/art/backgrounds.js (labInside,
// labDawn), with per-tick state turned into functions of f.

import { fadeEdges, drawPath, ledge, routeDone, routePoints, coreX } from '../kit.js';
import { col } from '../../art/palette.js';
import { stripedSky, line } from '../../art/draw.js';
import { makeCanvas, ease, clamp, lerp, rng } from '../../engine/util.js';

const C = (r) => col(r);
const span = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const F = 70;                               // the lab floor (feet y)

// the beats, as fractions of the act phase
const SLIDERS_AT = [0, 0.22];               // design inputs rise from the targets
const PRESS_AT = 0.2;                       // he presses Run
const RUN_AT = [0.22, 0.68];                // the bar fills, the racks blink
const BEADS_AT = [0.5, 0.96];               // the beads snap into a chain
const N = 8;                                // monomers

// a browser window: ink frame, title bar with three dots
function browser(b, x, y, w, h) {
  b.fillStyle = C('ink.0'); b.fillRect(x - 1, y - 1, w + 2, h + 2);
  b.fillStyle = C('#0f1430'); b.fillRect(x, y, w, h);
  b.fillStyle = C('indigo.2'); b.fillRect(x, y, w, 6);
  b.fillStyle = C('indigo.3'); b.fillRect(x, y, w, 1);
  [['red.2', 0], ['gold.2', 4], ['green.2', 8]].forEach(([c, dx]) => { b.fillStyle = C(c); b.fillRect(x + 3 + dx, y + 2, 2, 2); });
}

// a GPU rack: cabinet, rack-number pips, and two columns of LEDs
function rack(b, x, y, w, h, i) {
  b.fillStyle = C('ink.0'); b.fillRect(x - 1, y - 1, w + 2, h + 1);
  b.fillStyle = C('#121833'); b.fillRect(x, y, w, h);
  b.fillStyle = C('steel.2'); b.fillRect(x, y, w, 1);
  b.fillStyle = C('steel.3'); for (let k = 0; k <= i; k++) b.fillRect(x + 2 + k * 2, y + 2, 1, 1);
  for (let r = 0; r < 8; r++) { b.fillStyle = C('#0b0f24'); b.fillRect(x + 1, y + 6 + r * 4 + 2, w - 2, 1); }
}

// the LEDs: every rack shows the same pattern at the same moment (lockstep)
function leds(ctx, x, y, step, lit) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) {
    const on = lit && ((r + step + c * 2) % 4) < 2;
    ctx.fillStyle = C(on ? (c ? 'green.2' : 'teal.3') : 'slate.0');
    ctx.fillRect(x + 3 + c * 4, y + 6 + r * 4, 2, 2);
  }
}

// a monomer bead (setpieces Assembly)
function bead(ctx, x, y, k) {
  const rx = Math.round(x), ry = Math.round(y);
  ctx.fillStyle = C('ink.0'); ctx.fillRect(rx - 3, ry - 2, 6, 5); ctx.fillRect(rx - 2, ry - 3, 4, 7);
  ctx.fillStyle = C(k + '.2'); ctx.fillRect(rx - 2, ry - 2, 4, 4);
  ctx.fillStyle = C(k + '.3'); ctx.fillRect(rx - 2, ry - 2, 2, 1); ctx.fillRect(rx - 2, ry - 1, 1, 1);
}

export default {
  id: 'ornl',
  facts: ['x-ornl', 'x-ornl-1', 'x-ornl-2', 'x-ornl-3', 'x-ornl-4'],
  idle: true,

  build({ w, h }) {
    const c0 = coreX(w), c = Math.round(w / 2);
    const [back, b] = makeCanvas(w, h);
    // labInside: a dark lab with a panel grid
    stripedSky(b, w, h, ['#0e1433', '#0f1430', '#151b3d', '#1a2147']);
    b.fillStyle = C('#1a2350');
    for (let x = (c0 % 12) + 6; x < w; x += 12) b.fillRect(x, 6, 1, F - 6);
    for (let y = 18; y < F; y += 12) b.fillRect(0, y, w, 1);

    // a window onto the dawn ridges (labDawn, dimmed), in the left wing
    if (c0 >= 24) {
      const wx = c0 - 34, wy = 16, ww = 26, wh = 36;
      const [win, g] = makeCanvas(ww, wh);
      stripedSky(g, ww, wh, ['#141a3d', '#352d69', '#8f4170', '#e9795f']);
      const r = rng(11);
      [['#8a5583', 22, 4], ['#664277', 27, 3], ['#45356a', 31, 2]].forEach(([cc, base, amp]) => {
        g.fillStyle = C(cc);
        for (let x = 0, y = base; x < ww; x++) { if (x % 3 === 0) y = base - Math.round(r() * amp); g.fillRect(x, y, 1, wh - y); }
      });
      g.fillStyle = 'rgba(10,12,31,0.55)'; g.fillRect(0, 0, ww, wh);
      b.fillStyle = C('ink.0'); b.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      b.fillStyle = C('steel.1'); b.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      b.drawImage(win, wx, wy);
      b.fillStyle = C('steel.1'); b.fillRect(wx + ww / 2, wy, 1, wh); b.fillRect(wx, wy + wh / 2, ww, 1);
      // and a dim spare rack in the right wing
      rack(b, c0 + 166, 34, 11, F - 34, 4);
    }

    // the ceiling, with the shaft the cage comes down, and the catwalk under it
    b.fillStyle = C('ink.0'); b.fillRect(0, 0, w, 5);
    b.fillStyle = C('steel.1'); b.fillRect(0, 1, w, 3);
    b.fillStyle = C('steel.2'); b.fillRect(0, 1, w, 1);
    b.fillStyle = C('#0b0d17'); b.fillRect(c - 9, 0, 18, 5);
    const cat = { x: c0 + 56, w: 34, y: 13 };
    b.fillStyle = C('steel.1'); b.fillRect(cat.x + 3, 5, 1, cat.y - 5); b.fillRect(cat.x + cat.w - 4, 5, 1, cat.y - 5);
    ledge(b, cat.x, cat.y, cat.w, 'steel');

    // the floor: a pit for the beads between the desk and the racks
    const L = c0 + 62, R = c0 + 102;
    b.fillStyle = C('#0b0d17'); b.fillRect(0, F + 4, w, h - F - 4);
    ledge(b, 0, F, L, 'steel');
    ledge(b, R, F, w - R, 'steel');
    b.fillStyle = C('#090b1a'); b.fillRect(L, F + 1, R - L, h - F - 1);
    b.fillStyle = C('teal.0'); b.fillRect(L, F + 1, 1, h - F - 1); b.fillRect(R - 1, F + 1, 1, h - F - 1);

    // the web tool: targets in, design sliders, the Run row
    const win = { x: c0 + 4, y: 20, w: 46, h: 42 };
    browser(b, win.x, win.y, win.w, win.h);
    b.fillStyle = C('steel.1'); b.fillRect(win.x + 8, win.y + win.h + 1, 2, F - win.y - win.h - 1); b.fillRect(win.x + win.w - 10, win.y + win.h + 1, 2, F - win.y - win.h - 1);
    const tg = [7, 11, 8];                            // target properties: magenta bars
    tg.forEach((len, i) => {
      b.fillStyle = C('slate.0'); b.fillRect(win.x + 3, win.y + 10 + i * 6, 12, 3);
      b.fillStyle = C('magenta.2'); b.fillRect(win.x + 3, win.y + 10 + i * 6, len, 3);
      b.fillStyle = C('magenta.3'); b.fillRect(win.x + 3, win.y + 10 + i * 6, len, 1);
    });
    b.fillStyle = C('slate.3');                        // → from targets to inputs
    b.fillRect(win.x + 17, win.y + 16, 4, 1); b.fillRect(win.x + 20, win.y + 15, 1, 3); b.fillRect(win.x + 21, win.y + 16, 1, 1);
    const sliders = [0, 1, 2].map((i) => ({ x: win.x + 26 + i * 7, top: win.y + 9, bot: win.y + 26, v: win.y + [12, 20, 15][i] }));
    for (const s of sliders) {
      b.fillStyle = C('ink.0'); b.fillRect(s.x - 1, s.top, 3, s.bot - s.top + 1);
      b.fillStyle = C('slate.1'); b.fillRect(s.x, s.top + 1, 1, s.bot - s.top - 1);
    }
    const run = { x: win.x + 3, y: win.y + 33, w: 33, btn: win.x + 39 };
    b.fillStyle = C('ink.0'); b.fillRect(run.x - 1, run.y - 1, run.w + 2, 6);
    b.fillStyle = C('slate.0'); b.fillRect(run.x, run.y, run.w, 4);

    // four GPU racks right of the pit, on a shared bus, cabled to the web tool along the ceiling
    const racks = [0, 1, 2, 3].map((i) => ({ x: c0 + 107 + i * 12, y: 32 }));
    racks.forEach((r, i) => rack(b, r.x, r.y, 11, F - r.y, i));
    b.fillStyle = C('slate.1');
    b.fillRect(racks[0].x + 5, 6, 1, racks[0].y - 6);
    b.fillRect(win.x + 23, 6, racks[0].x + 5 - win.x - 22, 1);
    b.fillRect(win.x + 23, 6, 1, win.y - 7);

    // the chain's shape: hung from the two lips, sagging over the pit
    const sag = 11;
    const chainAt = (u) => [L + (R - L) * u, F + 2 + Math.sin(u * Math.PI) * sag];
    const r = rng(7);
    const beads = Array.from({ length: N }, (_, j) => {
      const [tx, ty] = chainAt(j / (N - 1));
      return { tx, ty, hx: L + 5 + r() * (R - L - 10), hy: F + 7 + r() * 11, ph: r() * 6.28, k: j % 2 ? 'teal' : 'magenta' };
    });
    const low = chainAt(0.5), q = chainAt(0.25);
    return {
      back, win, sliders, run, racks, beads, cat,
      mark: c0 + 57,
      route: {
        enter: [c, 0],
        via: [[c, cat.y], [cat.x + 4, cat.y], [cat.x + 4, F]],
        act: [c0 + 57, F],
        leave: [[L, F], [Math.round(q[0]), Math.round(q[1]) - 1], [Math.round(low[0]), Math.round(low[1]) - 1]],
        exit: [Math.round(low[0]), h],
      },
    };
  },

  draw(ctx, f, B) {
    ctx.drawImage(B.back, 0, 0);
    drawPath(ctx, routePoints(B.route), { done: routeDone(B.route, f) });
    const act = f.act, idle = f.phase === 'hold' ? Math.floor(f.t / 125) : 0;

    // inverse design: each slider's knob rises from the bottom of its track to its value
    B.sliders.forEach((s, i) => {
      const k = ease.outBack(span(SLIDERS_AT[0] + i * 0.05, SLIDERS_AT[1] - (2 - i) * 0.03, act));
      const y = Math.round(lerp(s.bot - 2, s.v, k));
      ctx.fillStyle = C('ink.0'); ctx.fillRect(s.x - 3, y - 1, 7, 4);
      ctx.fillStyle = C('gold.2'); ctx.fillRect(s.x - 2, y, 5, 2);
      ctx.fillStyle = C('gold.3'); ctx.fillRect(s.x - 2, y, 5, 1);
    });

    // Run: the button lights when he presses it, then the bar fills teal (RunBar)
    const rn = B.run, pressed = act >= PRESS_AT, fill = ease.inOutCubic(span(RUN_AT[0], RUN_AT[1], act));
    ctx.fillStyle = C('ink.0'); ctx.fillRect(rn.btn - 1, rn.y - 2, 7, 8);
    ctx.fillStyle = C(pressed ? 'green.1' : 'slate.1'); ctx.fillRect(rn.btn, rn.y - 1, 5, 6);
    ctx.fillStyle = C(pressed ? 'green.3' : 'slate.3');
    for (let i = 0; i < 3; i++) ctx.fillRect(rn.btn + 1 + i, rn.y + i - 0, 1, 4 - i * 2 + (i === 0 ? 1 : 0));
    const fw = Math.round(rn.w * fill);
    if (fw > 0) {
      ctx.fillStyle = C('teal.2'); ctx.fillRect(rn.x, rn.y, fw, 4);
      ctx.fillStyle = C('teal.3'); ctx.fillRect(rn.x, rn.y, fw, 1);
      ctx.fillStyle = C(fill >= 1 ? 'green.3' : 'green.2'); ctx.fillRect(rn.x + fw - 1, rn.y, 1, 4);
    }

    // the racks: blinking in lockstep while the run trains, then on the idle clock
    const running = act >= RUN_AT[0] && act < 1;
    const step = running ? Math.floor(act * 40) : f.phase === 'hold' && !f.reduced ? idle : 0;
    const lit = act >= RUN_AT[0];
    for (const r of B.racks) leds(ctx, r.x, r.y, step, lit);
    if (lit) {                                          // the shared bus and the cable light up
      const R0 = B.racks[0], R3 = B.racks[3];
      ctx.fillStyle = C(running && step % 2 ? 'teal.3' : 'teal.2'); ctx.fillRect(R0.x, R0.y - 2, R3.x + 11 - R0.x, 1);
      ctx.fillStyle = C('teal.1');
      const wx = B.win.x + 23;
      ctx.fillRect(R0.x + 5, 6, 1, R0.y - 6); ctx.fillRect(wx, 6, R0.x + 5 - wx, 1); ctx.fillRect(wx, 6, 1, B.win.y - 7);
      if (running) {                                    // a packet riding the cable from the tool to the racks
        const len = (R0.x + 5 - wx) + (B.win.y - 13) + (R0.y - 6);
        let d = ((step * 7) % len);
        let px, py;
        if (d < B.win.y - 13) { px = wx; py = B.win.y - 7 - d; } else if ((d -= B.win.y - 13) < R0.x + 5 - wx) { px = wx + d; py = 6; } else { px = R0.x + 5; py = 6 + d - (R0.x + 5 - wx); }
        ctx.fillStyle = C('teal.3'); ctx.fillRect(px - 1, py - 1, 3, 3);
      }
    }

    // the monomers: jittering in the pit, then snapping into a bonded chain
    const jit = f.phase === 'hold' ? idle * 0.9 : f.p * 40;
    const pos = B.beads.map((bd, j) => {
      const k = ease.outBack(span(BEADS_AT[0] + j * 0.04, BEADS_AT[0] + j * 0.04 + 0.16, act));
      const wob = 1 - Math.min(1, k);
      return [lerp(bd.hx, bd.tx, k) + Math.round(Math.sin(jit + bd.ph) * 2) * wob,
        lerp(bd.hy, bd.ty, k) + Math.round(Math.cos(jit * 1.3 + bd.ph) * 2) * wob, k];
    });
    for (let j = 1; j < N; j++) {
      if (pos[j - 1][2] > 0.85 && pos[j][2] > 0.85) line(ctx, pos[j - 1][0], pos[j - 1][1], pos[j][0], pos[j][1], 'teal.3');
    }
    B.beads.forEach((bd, j) => bead(ctx, pos[j][0], pos[j][1], bd.k));

    f.drawHero();
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, B) {
    if (f.phase === 'act') return { pose: f.act < 0.3 ? 'point' : 'idle', frame: 0, x: B.mark, y: F, facing: f.act < 0.3 ? -1 : 1 };
    if (f.phase === 'hold') {
      const blink = !f.reduced && Math.floor(f.t / 125) % 26 === 0 && f.t > 0;
      return { pose: blink ? 'blink' : 'idle', frame: 0, x: B.mark, y: F, facing: 1 };
    }
    return null;
  },

  labels(f, B) {
    const out = [];
    const done = f.act >= RUN_AT[1];
    // pinned to the window's left edge, so the wider "Run complete ✓" never runs off a 160 px scene
    out.push({ text: done ? 'Run complete ✓' : 'Run', x: B.win.x, y: 10, tone: done ? 'good' : 'gold', align: 'left' });
    // off once he starts sliding down the chain, so it never covers him
    if (f.act >= BEADS_AT[1] && f.phase !== 'out') out.push({ text: 'Molecular self-assembly', x: B.route.exit[0], y: 88, tone: 'cyan' });
    return out;
  },

  // ─── T2: slider knobs that drop into steps (inverse design) ───────
  // Four gold knobs wait at the top of their tracks; each drops to its
  // value as he nears it, and he hops down them. Cloud wisps at the
  // bottom are the first of Handshake's cloud tops.
  transit: {
    build({ w, h, from, to, side = 0, lane }) {
      const free = side ? -side : 1;
      const fx = from[0];
      // a staircase of tracks, centred on the free side of the lane (or on the middle on phones)
      const sp = Math.min(14, Math.floor((w - 16) / 4)), mid = side ? fx + free * 15 : w / 2;
      const xs = [0, 1, 2, 3].map((i) => Math.round(clamp(mid + (i - 1.5) * sp * free, 8, w - 8)));
      const ys = [0.17, 0.34, 0.51, 0.67].map((k) => Math.round(h * k));
      const knobs = xs.map((x, i) => ({ x, y: ys[i], top: 4 }));
      const r = rng(23);
      const wisps = [0, 1, 2].map((i) => ({
        x: Math.round(w / 2 + (i - 1) * w * 0.3 + (r() - 0.5) * 8), y: Math.round(h * (0.82 + i * 0.055)), w: 18 + Math.round(r() * 14),
      }));
      return { knobs, wisps, from, to, free, lane };
    },
    draw(ctx, g, B) {
      const s = g.reduced ? 1 : g.s;
      for (const wsp of B.wisps) cloud(ctx, wsp.x, wsp.y, wsp.w);
      B.knobs.forEach((kn, i) => {
        // the track and its scale
        ctx.fillStyle = C('ink.0'); ctx.fillRect(kn.x - 1, kn.top, 3, kn.y - kn.top + 8);
        ctx.fillStyle = C('slate.1'); ctx.fillRect(kn.x, kn.top + 1, 1, kn.y - kn.top + 6);
        ctx.fillStyle = C('slate.2'); for (let y = kn.top + 4; y < kn.y + 6; y += 6) ctx.fillRect(kn.x + 2, y, 2, 1);
        const y = Math.round(lerp(kn.top + 2, kn.y, knobK(s, i)));
        ctx.fillStyle = C('ink.0'); ctx.fillRect(kn.x - 7, y - 1, 15, 6);
        ctx.fillStyle = C('gold.2'); ctx.fillRect(kn.x - 6, y, 13, 4);
        ctx.fillStyle = C('gold.3'); ctx.fillRect(kn.x - 6, y, 13, 1);
        ctx.fillStyle = C('gold.1'); ctx.fillRect(kn.x - 6, y + 3, 13, 1); ctx.fillRect(kn.x, y + 1, 1, 2);
      });
    },
    hero(g, B) {
      const s = g.s, pts = [B.from, ...B.knobs.map((k) => [k.x, k.y])];
      const seg = 0.84 / 4;
      if (s < 0.84) {
        const i = Math.min(3, Math.floor(s / seg)), u = (s - i * seg) / seg;
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const face = (x1 >= x0 ? 1 : -1) * (g.dir < 0 ? -1 : 1);
        if (i === 0) {                                   // straight down off the chain onto the first knob
          return { pose: u > 0.95 ? 'crouch' : g.dir < 0 ? 'jump' : 'fall', frame: 0, x: lerp(x0, x1, u), y: lerp(y0, y1, u * u), facing: face };
        }
        if (u < 0.3) return { pose: g.still ? 'idle' : 'lookDown', frame: 0, x: x0, y: y0, facing: face };
        const v = (u - 0.3) / 0.7;
        const y = lerp(y0, y1, v) - 7 * 4 * v * (1 - v);
        const rising = (v < 0.5) === (g.dir > 0);
        return { pose: v > 0.93 ? 'crouch' : rising ? 'jump' : 'fall', frame: 0, x: lerp(x0, x1, v), y, facing: face };
      }
      const u = (s - 0.84) / 0.16, [x0, y0] = pts[4];
      return { pose: g.dir < 0 ? 'jump' : 'fall', frame: 0, x: lerp(x0, B.to[0], u), y: lerp(y0, B.to[1], u * u), facing: B.to[0] >= x0 ? 1 : -1 };
    },
  },
};

// knob i drops to its value while he stands on the step before it
function knobK(s, i) {
  const seg = 0.84 / 4;
  return i === 0 ? ease.outCubic(span(0, seg * 0.6, s)) : ease.outCubic(span(i * seg, i * seg + seg * 0.3, s));
}

// a flat cloud wisp in two stepped bands (no dithering)
function cloud(ctx, x, y, w) {
  const l = Math.round(x - w / 2), t = Math.round(w * 0.4);
  ctx.fillStyle = C('slate.1');
  ctx.fillRect(l, y, w, 3); ctx.fillRect(l + 3, y - 2, w - 8, 2); ctx.fillRect(l + 6, y - 3, t, 1);
  ctx.fillStyle = C('slate.2');
  ctx.fillRect(l + 3, y - 2, w - 8, 1); ctx.fillRect(l + 6, y - 3, t, 1);
}

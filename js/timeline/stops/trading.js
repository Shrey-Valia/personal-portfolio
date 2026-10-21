// Algorithmic trading bot (Apr–Aug 2024). He drops in on the chart's
// baseline, steps onto the RL agent's autopilot cart, folds his arms (no
// manual input) and rides it up a rising equity curve past an entry ▲ and
// a higher exit ▼ (gold, not red: red-down reads as a loss), to the
// backtest board. The figures on the board are
// read from the card (p-trade-4) at build time, never typed here, and the
// "$50,000" on the portfolio plate is read from p-trade-1.
// Art rule: nothing here shows a price line moving down; the curve only
// ever rises or holds.
// The transit is T8: he jumps off the board ledge onto a cyan git branch
// and slides through its commits as it merges into the gold main line.
// Scene plan: docs/TIMELINE-SCENES.md. Contract: docs/BUILDING-STOPS.md.
//
// Drawing code is copied from js/themes/trading.js (tradingBackdrop's
// grid and hollow up-candles, the curve kit, Autopilot's rail and cart,
// arrow, PortfolioBanner, Results) with per-tick state turned into
// functions of f.act.
//
// His act runs from the top edge: `split` gives the engine's walk-in a
// sliver of p, so the act can carry him from the entrance to the cart
// and up the curve, and route.act is where the ride ends (his hold mark,
// where the engine's walk-out starts).

import { fadeEdges, drawPath, ledge, coreX, pathLength } from '../kit.js';
import { col } from '../../art/palette.js';
import { stripedSky, line } from '../../art/draw.js';
import { makeCanvas, ease, clamp, lerp } from '../../engine/util.js';

const C = (r) => col(r);
const span = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const BASE = 82;                      // the chart's baseline, where the cart docks
const CART_H = 11;                    // cart top above the rail

// the beats, as fractions of the act phase
const DROP_AT = [0, 0.12];            // he drops in from the entrance
const WALK_AT = [0.12, 0.24];         // walks the baseline to the dock
const HOP_AT = [0.24, 0.3];           // hops onto the cart
const RIDE_AT = [0.32, 0.8];          // the cart rides the curve
const BOARD_AT = [0.8, 0.9];          // the two figures land on the board, one after the other

// small ▲ / ▼ glyphs drawn as pixels, so the shape reads without colour
function arrow(ctx, x, y, up, color, s = 3) {
  ctx.fillStyle = C(color);
  for (let i = 0; i < s; i++) {
    const w = 1 + i * 2, yy = up ? y + i : y + s - 1 - i;
    ctx.fillRect(Math.round(x - i), Math.round(yy), w, 1);
  }
}

// the résumé is the only source of numbers here
function factText(el, id) {
  const n = el && el.querySelector(`[data-fact="${id}"]`);
  return n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
}

// a point k (0–1) of the way along a polyline, by length
function along(pts, k) {
  const L = pathLength(pts);
  let d = clamp(k, 0, 1) * L;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = Math.hypot(x1 - x0, y1 - y0);
    if (d <= s || i === pts.length - 1) { const u = s ? clamp(d / s, 0, 1) : 1; return [lerp(x0, x1, u), lerp(y0, y1, u)]; }
    d -= s;
  }
  return pts[pts.length - 1];
}

// the curve's height at x (it only rises or holds, left to right)
function curveY(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
}

export default {
  id: 'trading',
  facts: ['p-trade', 'p-trade-1', 'p-trade-2', 'p-trade-3', 'p-trade-4'],
  split: [0.0001, 0.6, 0.85],

  build({ w, h, el }) {
    const c0 = coreX(w), c = Math.round(w / 2);
    const [back, b] = makeCanvas(w, h);
    // the navy terminal: chart grid, and a dim history of hollow up-candles on a rising drift
    stripedSky(b, w, h, ['#0e1433', '#0b1636', '#0b1636', '#0a1430']);
    b.fillStyle = C('#0f1c44');
    for (let x = (c0 % 12) + 4; x < w; x += 12) b.fillRect(x, 8, 1, BASE - 8);
    for (let y = 16; y < BASE; y += 12) b.fillRect(0, y, w, 1);
    for (let x = 6, i = 0; x < w - 6; x += 9, i++) {
      const mid = 62 - (x / w) * 34;
      const top = Math.round(mid - 4 - (i % 3)), bot = Math.round(mid + 3);
      b.fillStyle = C('#173d34');
      b.fillRect(x + 2, top - 3, 1, bot - top + 6);
      b.fillRect(x, top, 5, 1); b.fillRect(x, bot, 5, 1); b.fillRect(x, top, 1, bot - top); b.fillRect(x + 4, top, 1, bot - top);
      b.fillStyle = C('#0b1636'); b.fillRect(x + 1, top + 1, 3, bot - top - 1);
    }

    // the chart itself goes on a layer over the path, so the way out runs behind it
    const [mid, m] = makeCanvas(w, h);

    // the equity curve: it rises or holds, never falls
    const rail = [[c0 + 20, BASE], [c0 + 34, BASE], [c0 + 46, 72], [c0 + 55, 72], [c0 + 67, 62], [c0 + 75, 62], [c0 + 88, 52]];
    const end = rail[rail.length - 1];
    // the shaded area under it, in flat bands
    const tint = ['#15403f', '#133442', '#11293e', '#0f2139'];
    for (let x = rail[0][0]; x <= end[0]; x++) {
      const y = Math.round(curveY(rail, x));
      for (let yy = y + 2; yy < BASE; yy++) { m.fillStyle = C(tint[Math.min(3, (yy - y) >> 3)]); m.fillRect(x, yy, 1, 1); }
    }
    // the station under the board: the curve's last level carried on as a ledge
    ledge(m, end[0] + 4, end[1], w - end[0] - 4, 'rail');
    // the line itself, phosphor green over a darker shadow
    for (let i = 1; i < rail.length; i++) {
      const [x0, y0] = rail[i - 1], [x1, y1] = rail[i];
      line(m, x0, y0 + 1, x1, y1 + 1, 'green.1');
      line(m, x0, y0, x1, y1, 'green.3');
    }
    for (const [x, y] of rail.slice(1)) { m.fillStyle = C('green.3'); m.fillRect(x - 1, y - 1, 3, 3); }
    // the baseline he lands on, out to the drop at the exit
    m.fillStyle = C('#0a1430'); m.fillRect(0, BASE + 5, end[0] - 4, h - BASE - 5);
    ledge(m, 0, BASE, end[0] - 4, 'rail');

    // the backtest board, on two posts above the station
    const bd = { x: c0 + 98, y: 12, w: 56, h: 34 };
    b.fillStyle = C('steel.1'); b.fillRect(bd.x + 8, bd.y + bd.h, 2, end[1] - bd.y - bd.h); b.fillRect(bd.x + bd.w - 10, bd.y + bd.h, 2, end[1] - bd.y - bd.h);
    b.fillStyle = C('ink.0'); b.fillRect(bd.x - 1, bd.y - 1, bd.w + 2, bd.h + 2);
    b.fillStyle = C('#071526'); b.fillRect(bd.x, bd.y, bd.w, bd.h);
    b.fillStyle = C('#22356a'); b.fillRect(bd.x, bd.y, bd.w, 1); b.fillRect(bd.x, bd.y + bd.h - 1, bd.w, 1);
    const slots = [bd.y + 5, bd.y + 19];
    for (const y of slots) { b.fillStyle = C('#0c1d33'); b.fillRect(bd.x + 4, y, bd.w - 8, 11); }

    // the simulated-portfolio plate under the baseline (drawn in draw() while its label shows)
    const plate = { x: c0 + 10, y: 86, w: 52 };

    // the figures: read from the card, or left off if the card doesn't say them
    const t4 = factText(el, 'p-trade-4'), t1 = factText(el, 'p-trade-1');
    const win = /\d+(?:\.\d+)?\s*%\s*win rate/i.exec(t4), pf = /\d+(?:\.\d+)?\s*profit factor/i.exec(t4), cash = /\$[\d,]+/.exec(t1);

    const dock = [rail[0][0], BASE];
    const ride = rail.map(([x, y]) => [x, y - CART_H]);
    const exit = [Math.min(c + 8, end[0]), h];
    return {
      back, mid, rail, ride, dock, bd, slots, plate,
      figures: [win && win[0], pf && pf[0]],
      cash: cash ? 'Simulated ' + cash[0] : '',
      marks: [{ x: c0 + 40, up: true, at: 0.22 }, { x: c0 + 71, up: false, at: 0.62 }],
      drop: [c - 4, 0],
      route: {
        enter: [c - 4, 0], via: [[c - 4, BASE]],
        act: [end[0], end[1] - CART_H], leave: [], exit,
      },
    };
  },

  draw(ctx, f, B) {
    ctx.drawImage(B.back, 0, 0);
    const act = f.act, r = B.route;

    // the spine: down from the entrance to the baseline, and down from the board to the exit
    const inPts = [r.enter, [r.enter[0], BASE]], outPts = [r.act, r.exit];
    const inLen = pathLength(inPts), outLen = pathLength(outPts);
    const before = f.phase === 'before', after = f.phase === 'after' || f.reduced;
    drawPath(ctx, inPts, { done: after ? Infinity : before ? -1 : inLen * span(DROP_AT[0], DROP_AT[1], act) });
    drawPath(ctx, outPts, { done: after ? Infinity : f.phase === 'out' ? outLen * f.walk : -1 });
    ctx.drawImage(B.mid, 0, 0);

    // the cart: parked at the dock, then riding the curve
    const k = ease.inOutCubic(span(RIDE_AT[0], RIDE_AT[1], act));
    const [cx, cy] = along(B.rail, k);
    // entry and exit signals pop as the cart passes them: ▲ under the line, ▼ above it, higher up
    for (const m of B.marks) {
      if (k < m.at) continue;
      const y = Math.round(curveY(B.rail, m.x));
      if (m.up) { ctx.fillStyle = C('ink.0'); ctx.fillRect(m.x - 4, y + 4, 9, 6); arrow(ctx, m.x, y + 5, true, 'green.3', 4); }
      else { ctx.fillStyle = C('ink.0'); ctx.fillRect(m.x - 4, y - 18, 9, 6); arrow(ctx, m.x, y - 17, false, 'gold.3', 4); }
    }
    cart(ctx, Math.round(cx), Math.round(cy), act > HOP_AT[0] && act < 1, k);

    // the simulated-portfolio plate, only while its label is up (it gives way to the board's figures)
    if (B.cash && act < BOARD_AT[0]) {
      const pl = B.plate;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(pl.x - 1, pl.y - 1, pl.w + 2, 12);
      ctx.fillStyle = C('indigo.1'); ctx.fillRect(pl.x, pl.y, pl.w, 10);
      for (let i = 3; i < pl.w - 2; i += 5) { ctx.fillStyle = C(i % 15 === 3 ? 'gold.3' : 'gold.1'); ctx.fillRect(pl.x + i, pl.y + 9, 2, 1); }
    }

    // the board: two figures land, each in its slot
    const bd = B.bd;
    B.slots.forEach((y, i) => {
      const on = B.figures[i] && act >= BOARD_AT[0] + i * (BOARD_AT[1] - BOARD_AT[0]);
      ctx.fillStyle = C(on ? 'green.2' : '#1b2a4a');
      ctx.fillRect(bd.x + 4, y, bd.w - 8, 1); ctx.fillRect(bd.x + 4, y + 10, bd.w - 8, 1);
      if (!on) { ctx.fillStyle = C('#22356a'); ctx.fillRect(bd.x + bd.w / 2 - 6, y + 5, 12, 1); }
    });
    if (act >= BOARD_AT[0]) { ctx.fillStyle = C('green.2'); ctx.fillRect(bd.x, bd.y, bd.w, 1); ctx.fillRect(bd.x, bd.y + bd.h - 1, bd.w, 1); }

    f.drawHero();
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, B) {
    const act = f.act, d = f.dir < 0 ? -1 : 1;
    const [dx] = B.dock, [x0, y0] = B.drop;
    if (f.phase === 'act') {
      if (act < DROP_AT[1]) {                            // drop in from the entrance
        const u = span(DROP_AT[0], DROP_AT[1], act);
        return { pose: d < 0 ? 'jump' : u < 0.12 ? 'jump' : 'fall', frame: 0, x: x0, y: lerp(y0, BASE, u * u), facing: 1 };
      }
      if (act < WALK_AT[1]) {                            // walk the baseline to the dock
        const u = span(WALK_AT[0], WALK_AT[1], act);
        if (u < 0.15) return { pose: 'crouch', frame: 0, x: x0, y: BASE, facing: -d };
        const x = lerp(x0, dx, (u - 0.15) / 0.85);
        return { pose: f.still ? 'idle' : 'run', frame: Math.floor(Math.abs(x0 - x) / 5) % 4, x, y: BASE, facing: -d };
      }
      if (act < HOP_AT[1]) {                             // hop up onto the cart
        const u = span(HOP_AT[0], HOP_AT[1], act);
        return { pose: u < 0.5 === d > 0 ? 'jump' : 'fall', frame: 0, x: dx, y: BASE - CART_H * u - 8 * Math.sin(u * Math.PI), facing: 1 };
      }
    }
    // on the cart, arms folded: the agent trades, not him
    const k = ease.inOutCubic(span(RIDE_AT[0], RIDE_AT[1], f.phase === 'hold' ? 1 : act));
    const [x, y] = along(B.ride, k);
    return { pose: 'crossArms', frame: 0, x, y, facing: 1 };
  },

  labels(f, B) {
    const act = f.act;
    if (act >= BOARD_AT[0]) {
      const cx = B.bd.x + B.bd.w / 2 - 2;
      return B.figures.map((t, i) => (t && act >= BOARD_AT[0] + i * (BOARD_AT[1] - BOARD_AT[0])
        ? { text: t, x: cx, y: B.slots[i] - 1, tone: 'good' } : null)).filter(Boolean);
    }
    const out = [];
    if (B.cash) out.push({ text: B.cash, x: B.plate.x + B.plate.w / 2, y: B.plate.y - 1, tone: 'gold' });
    if (act > HOP_AT[1] && act < RIDE_AT[1] + 0.02) {
      const [x, y] = along(B.ride, ease.inOutCubic(span(RIDE_AT[0], RIDE_AT[1], act)));
      out.push({ text: 'Without manual input', x: clamp(x, B.rail[0][0] + 26, B.bd.x + 8), y: Math.round(y) - 38, tone: 'good' });
    }
    return out;
  },

  // ─── T8: off the board ledge, down a git branch into main ─────────
  // He jumps off onto the first commit of a cyan branch that forks from
  // the gold main line, slides down it through its commits (each lights
  // as he passes) and lands on the merge commit, then rides main down to
  // the skills tree's crown.
  transit: {
    build({ w, h, from, to, side = 0 }) {
      const free = side ? -side : 1;
      const mx = to[0];
      const fork = [mx, 6], b1 = [Math.round(clamp(mx + free * 22, 6, w - 6)), 24], merge = [mx, h - 16];
      const commits = [0.25, 0.5, 0.75].map((u) => [Math.round(lerp(b1[0], merge[0], u)), Math.round(lerp(b1[1], merge[1], u))]);
      return { from, to, mx, fork, b1, merge, commits, free };
    },
    draw(ctx, g, B) {
      const s = g.reduced ? 1 : g.s, { mx, fork, b1, merge, h } = B;
      // main: a gold line the whole height
      ctx.fillStyle = C('ink.0'); ctx.fillRect(mx - 2, 0, 4, h);
      ctx.fillStyle = C('gold.2'); ctx.fillRect(mx - 1, 0, 2, h);
      ctx.fillStyle = C('gold.3'); ctx.fillRect(mx - 1, 0, 1, h);
      // the branch: a fork leg and one long run back into main
      for (const [a, z] of [[fork, b1], [b1, merge]]) {
        line(ctx, a[0] - 1, a[1], z[0] - 1, z[1], 'ink.0'); line(ctx, a[0] + 2, a[1], z[0] + 2, z[1], 'ink.0');
        line(ctx, a[0], a[1], z[0], z[1], 'cyan.2'); line(ctx, a[0] + 1, a[1], z[0] + 1, z[1], 'cyan.1');
      }
      // commits on main above the fork, then the branch's own
      dot(ctx, fork[0], fork[1], 'gold', true);
      dot(ctx, b1[0], b1[1], 'cyan', s >= JUMP);
      B.commits.forEach(([x, y], i) => dot(ctx, x, y, 'cyan', s >= slideAt((i + 1) / 4)));
      // the merge commit: a bigger gold ring, filled once he reaches it
      const on = s >= slideAt(1);
      ctx.fillStyle = C('ink.0'); ctx.fillRect(merge[0] - 4, merge[1] - 3, 9, 7); ctx.fillRect(merge[0] - 3, merge[1] - 4, 7, 9);
      ctx.fillStyle = C('gold.2'); ctx.fillRect(merge[0] - 3, merge[1] - 2, 7, 5); ctx.fillRect(merge[0] - 2, merge[1] - 3, 5, 7);
      ctx.fillStyle = C(on ? 'gold.3' : '#0b1636'); ctx.fillRect(merge[0] - 2, merge[1] - 1, 5, 3); ctx.fillRect(merge[0] - 1, merge[1] - 2, 3, 5);
      if (on) { ctx.fillStyle = C('white.2'); ctx.fillRect(merge[0] - 1, merge[1] - 1, 1, 1); }
    },
    hero(g, B) {
      const s = g.s, d = g.dir < 0 ? -1 : 1, { from, b1, merge, to } = B;
      if (s < JUMP) {                                    // off the ledge onto the branch's first commit
        const u = s / JUMP;
        const rising = (u < 0.45) === (d > 0);
        return { pose: rising ? 'jump' : 'fall', frame: 0, x: lerp(from[0], b1[0], u), y: lerp(from[1], b1[1], u) - 10 * Math.sin(u * Math.PI), facing: (b1[0] >= from[0] ? 1 : -1) * d };
      }
      const face = (merge[0] >= b1[0] ? 1 : -1) * d;
      if (s < SLIDE_END) {                               // slide the branch through its commits
        const u = (s - JUMP) / (SLIDE_END - JUMP);
        return { pose: 'slide', frame: 0, x: lerp(b1[0], merge[0], u), y: lerp(b1[1], merge[1], u), facing: face };
      }
      const u = (s - SLIDE_END) / (1 - SLIDE_END);       // merged: down main to the crown
      return { pose: u < 0.2 ? 'crouch' : g.dir < 0 ? 'jump' : 'fall', frame: 0, x: lerp(merge[0], to[0], u), y: lerp(merge[1], to[1], u), facing: face };
    },
  },
};

const JUMP = 0.15, SLIDE_END = 0.9;
const slideAt = (u) => JUMP + (SLIDE_END - JUMP) * u;

// a commit dot: an ink ring with a hollow centre, filled once passed
function dot(ctx, x, y, ramp, lit) {
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillRect(x - 2, y - 3, 5, 7);
  ctx.fillStyle = C(ramp + '.2'); ctx.fillRect(x - 2, y - 2, 5, 5);
  ctx.fillStyle = C(lit ? ramp + '.3' : '#0b1636'); ctx.fillRect(x - 1, y - 1, 3, 3);
}

// the autopilot cart (Autopilot.draw): a terminal on wheels whose screen
// shows a rising sparkline; (x, y) is the middle of its wheels on the rail
function cart(ctx, x, y, on, k) {
  const w = 18, l = x - 9, t = y - CART_H;
  ctx.fillStyle = C('ink.0'); ctx.fillRect(l - 1, t - 1, w + 2, 9);
  ctx.fillStyle = C('steel.3'); ctx.fillRect(l, t, w, 7);
  ctx.fillStyle = C('steel.4'); ctx.fillRect(l, t, w, 1);
  ctx.fillStyle = C('steel.1'); ctx.fillRect(l, t + 6, w, 1);
  ctx.fillStyle = C('#071a12'); ctx.fillRect(l + 3, t + 2, w - 6, 3);
  if (on) {
    ctx.fillStyle = C('green.3');
    const n = Math.round((w - 8) * Math.max(0.3, k));
    for (let i = 0; i < n; i++) ctx.fillRect(l + 4 + i, t + 4 - Math.floor((i / (w - 8)) * 2.9), 1, 1);
  } else { ctx.fillStyle = C('slate.2'); ctx.fillRect(l + 6, t + 3, 6, 1); }
  for (const wx of [l + 3, l + w - 6]) {
    ctx.fillStyle = C('ink.0'); ctx.fillRect(wx - 1, t + 7, 5, 4);
    ctx.fillStyle = C('slate.3'); ctx.fillRect(wx, t + 8, 3, 2);
  }
}

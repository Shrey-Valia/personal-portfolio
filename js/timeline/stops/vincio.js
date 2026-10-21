// Vincio, AI video editor (Jan–Aug 2026). He types at the Vincio window
// (the front end he built); raw clips and a written vision drop into the
// edit timeline, four agent bots (B-roll, motion, transition, text) each
// add their piece in turn, and a render bar fills to final_cut.mp4.
// He leaves down a lift hatch: the transit is T1, a steel cage elevator
// whose cable pays out as he rides down to Oak Ridge.
// Scene plan: docs/TIMELINE-SCENES.md. Contract: docs/BUILDING-STOPS.md.
//
// Drawing code is copied from js/themes/vincio.js (CLIP, scenePic,
// drawClip, the agents, beam, diamond, bowtie, the browser window) with
// every per-tick field turned into a function of f.act and f.hold.

import { sky, fadeEdges, drawPath, ledge, routeDone, routePoints, coreX, FLOOR } from '../kit.js';
import { col } from '../../art/palette.js';
import { makeCanvas, ease, clamp, lerp } from '../../engine/util.js';

const C = (r) => col(r);
const span = (a, b, x) => clamp((x - a) / (b - a), 0, 1);

// timeline clip colours by track kind: dark, body, header, highlight
const CLIP = {
  video: ['cyan.0', 'cyan.1', 'cyan.2', 'cyan.3'],
  text: ['gold.0', 'gold.1', 'gold.2', 'gold.3'],
  fx: ['magenta.0', 'magenta.1', 'magenta.2', 'magenta.3'],
  trans: ['slate.1', 'slate.2', 'slate.3', 'white.1'],
  off: ['slate.0', 'slate.1', 'slate.2', 'slate.3'],
};

// footage in the thumbnails: sky, land, light
const SCENES = [
  ['#f2a65a', '#7c3f4f', '#ffe08a'],   // sunset over hills
  ['#63b8de', '#1f5f6e', '#e3f6ff'],   // coastline
  ['#5b4fa8', '#221c45', '#ffd27a'],   // city at night
  ['#9ccf73', '#3d6b2e', '#fbf8f1'],   // a park at noon
];

function scenePic(ctx, x, y, w, h, s) {
  const [skyc, land, light] = SCENES[s % SCENES.length];
  ctx.fillStyle = C(skyc); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C(light);
  ctx.fillRect(x + Math.round(w * 0.62), y + Math.max(0, Math.round(h * 0.2)), Math.max(1, w >> 3), Math.max(1, h >> 3));
  ctx.fillStyle = C(land);
  for (let i = 0; i < w; i++) {
    const hy = Math.round(h * 0.58 + Math.sin((i / w) * Math.PI * 2.4 + s * 1.7) * h * 0.09);
    ctx.fillRect(x + i, y + hy, 1, h - hy);
  }
}

// a clip on the timeline: chamfered outline, header band, film frames
function drawClip(ctx, x, y, w, h, kind, scene = -1) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  if (w < 3) return;
  const [d, b, m, l] = CLIP[kind].map(C);
  ctx.fillStyle = C('ink.0');
  ctx.fillRect(x, y - 1, w, h + 2); ctx.fillRect(x - 1, y, w + 2, h);
  ctx.fillStyle = b; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = l; ctx.fillRect(x + 1, y, w - 2, 1);
  ctx.fillStyle = m; ctx.fillRect(x, y + 1, w, 2);
  ctx.fillStyle = d; ctx.fillRect(x, y + h - 1, w, 1);
  if (scene >= 0 && h >= 8) {
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 1, y + 3, w - 2, h - 4);
    scenePic(ctx, x + 2, y + 4, w - 4, h - 6, scene);
  }
}

// the clip's place in the cut, as 1–4 pips in its header (no digits)
function pips(ctx, x, y, n) {
  ctx.fillStyle = C('white.2');
  for (let k = 0; k < n; k++) ctx.fillRect(Math.round(x) + 2 + k * 2, Math.round(y) + 1, 1, 1);
}

// a compact edit bot: screen face, antenna, a thruster while it works
function drawAgent(ctx, x, y, kind, on, busy) {
  x = Math.round(x); y = Math.round(y);
  const [d, b, m, l] = CLIP[on ? kind : 'off'].map(C);
  if (busy) { ctx.fillStyle = C('gold.3'); ctx.fillRect(x - 1, y + 6, 3, 2); ctx.fillStyle = C('orange.2'); ctx.fillRect(x, y + 8, 1, 1); }
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 6, y - 4, 13, 10); ctx.fillRect(x - 5, y - 5, 11, 12);
  ctx.fillStyle = b; ctx.fillRect(x - 5, y - 4, 11, 10);
  ctx.fillStyle = l; ctx.fillRect(x - 4, y - 4, 9, 1);
  ctx.fillStyle = d; ctx.fillRect(x - 5, y + 5, 11, 1);
  ctx.fillStyle = C('#0f1430'); ctx.fillRect(x - 3, y - 2, 7, 5);
  if (on) { ctx.fillStyle = C('white.2'); ctx.fillRect(x - 2, y - 1, 1, 2); ctx.fillRect(x + 2, y - 1, 1, 2); }
  else { ctx.fillStyle = C('slate.2'); ctx.fillRect(x - 2, y + 1, 2, 1); ctx.fillRect(x + 2, y + 1, 2, 1); }
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x, y - 9, 1, 4);
  ctx.fillStyle = on ? m : C('slate.2'); ctx.fillRect(x - 1, y - 10, 3, 2);
}

// a dotted beam from an agent to whatever it is working on; it draws in
// from the bot as k goes 0 → 1
function beam(ctx, x0, y0, x1, y1, color, k = 1) {
  const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 2));
  ctx.fillStyle = C(color);
  for (let i = 0; i <= n * k; i += 2) ctx.fillRect(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), 1, 1);
}

function diamond(ctx, x, y, c) {
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillRect(x - 1, y - 3, 3, 7);
  ctx.fillStyle = C(c); ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x, y - 2, 1, 5);
}

// the cross-dissolve marker from a timeline: two facing triangles
function bowtie(ctx, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 5, y - 4, 11, 9);
  ctx.fillStyle = C('slate.2'); ctx.fillRect(x - 4, y - 3, 9, 7);
  ctx.fillStyle = C('white.1');
  for (let i = 0; i < 3; i++) { ctx.fillRect(x - 4 + i, y - 3 + i, 1, 7 - i * 2); ctx.fillRect(x + 4 - i, y - 3 + i, 1, 7 - i * 2); }
}

// a browser window: ink frame, title bar with three dots
function browser(b, x, y, w, h) {
  b.fillStyle = C('ink.0'); b.fillRect(x - 1, y - 1, w + 2, h + 2);
  b.fillStyle = C('#0f1430'); b.fillRect(x, y, w, h);
  b.fillStyle = C('indigo.2'); b.fillRect(x, y, w, 6);
  b.fillStyle = C('indigo.3'); b.fillRect(x, y, w, 1);
  [['red.2', 0], ['gold.2', 4], ['green.2', 8]].forEach(([c, dx]) => { b.fillStyle = C(c); b.fillRect(x + 3 + dx, y + 2, 2, 2); });
}

// a dim studio panel for the wings (media bin, inspector)
function studioPanel(b, x, y, w, h, kind) {
  b.fillStyle = C('#1f2230'); b.fillRect(x - 1, y - 1, w + 2, h + 2);
  b.fillStyle = C('#13151e'); b.fillRect(x, y, w, h);
  b.fillStyle = C('#1b1e2a'); b.fillRect(x, y, w, 5);
  if (kind === 'bin') {
    for (let r = 0; r * 13 + 9 < h - 2; r++) for (let c = 0; c * 15 + 14 < w; c++) {
      const tx = x + 3 + c * 15, ty = y + 8 + r * 13;
      b.fillStyle = C('#0b0c12'); b.fillRect(tx - 1, ty - 1, 14, 11);
      scenePic(b, tx, ty, 12, 9, (r * 2 + c) % 4);
      b.fillStyle = 'rgba(19,21,30,0.62)'; b.fillRect(tx, ty, 12, 9);
    }
  } else {
    for (let i = 0; 9 + i * 8 < h - 3; i++) {
      b.fillStyle = C('#22263a'); b.fillRect(x + 4, y + 10 + i * 8, w - 8, 1);
      b.fillStyle = C('#3a4058'); b.fillRect(x + 4 + ((i * 11) % (w - 12)), y + 8 + i * 8, 2, 5);
    }
  }
}

// ─── the beats, as fractions of the act phase ───────────────────────

const CLIPS_AT = [0.02, 0.3];             // raw clips and the vision drop into the timeline
const AGENT_AT = [0.3, 0.82];             // four agents, one after another
const RENDER_AT = [0.82, 1];              // the render bar fills
const ORDER = [2, 0, 3, 1];               // clip i floats at slot ORDER.indexOf(i): 3, 1, 4, 2
const NAMES = [
  ['B-roll selection', 'cyan'],           // p-vincio-2, verbatim
  ['Motion graphics', 'plain'],
  ['Transitions', 'plain'],
  ['On-screen text', 'gold'],
];
const KINDS = ['video', 'fx', 'trans', 'text'];

const agentK = (act, i) => {
  const [a, b] = AGENT_AT, d = (b - a) / 4;
  return span(a + i * d, a + (i + 1) * d, act);
};

export default {
  id: 'vincio',
  facts: ['p-vincio', 'p-vincio-1', 'p-vincio-2', 'p-vincio-3'],

  build({ w, h }) {
    const c0 = coreX(w);
    const [back, b] = makeCanvas(w, h);
    sky(b, w, h, ['#10131f', '#12141d', '#12141d']);

    // the wings: a dim media bin and an inspector, only when there's room
    if (c0 >= 22) {
      studioPanel(b, c0 - 36, 20, 30, 50, 'bin');
      studioPanel(b, c0 + 166, 26, 30, 44, 'inspector');
    }

    // the floor, with the lift hatch at the exit
    const hatch = { x: c0 + 70, w: 14 };
    b.fillStyle = C('#0b0d17'); b.fillRect(0, FLOOR + 4, w, h - FLOOR - 4);
    ledge(b, 0, FLOOR, hatch.x, 'steel');
    ledge(b, hatch.x + hatch.w, FLOOR, w - hatch.x - hatch.w, 'steel');
    // hazard lips on the hatch, a pulley at its left lip, a winch drum beside it
    for (let i = 0; i < 3; i++) {
      b.fillStyle = C(i % 2 ? 'ink.0' : 'gold.2');
      b.fillRect(hatch.x - 6 + i * 2, FLOOR, 2, 1); b.fillRect(hatch.x + hatch.w + i * 2, FLOOR, 2, 1);
    }
    b.fillStyle = C('ink.0'); b.fillRect(hatch.x + 1, FLOOR - 3, 5, 5);
    b.fillStyle = C('steel.3'); b.fillRect(hatch.x + 2, FLOOR - 2, 3, 3);
    b.fillStyle = C('steel.1'); b.fillRect(hatch.x + 3, FLOOR - 1, 1, 1);
    b.fillStyle = C('slate.3'); b.fillRect(hatch.x + 5, FLOOR, 1, h - FLOOR);   // the cable down the shaft

    // the Vincio window on its stand (the front end he built), keyboard shelf in front
    const win = { x: c0 + 8, y: 44, w: 32, h: 24 };
    browser(b, win.x, win.y, win.w, win.h);
    b.fillStyle = C('ink.0'); b.fillRect(win.x + 3, win.y + 8, win.w - 6, 10);
    scenePic(b, win.x + 4, win.y + 9, win.w - 8, 8, 1);
    b.fillStyle = C('steel.1'); b.fillRect(win.x + win.w / 2 - 1, win.y + win.h + 1, 3, FLOOR - win.y - win.h - 1);
    b.fillStyle = C('ink.0'); b.fillRect(win.x + 14, FLOOR - 1, 7, 1);
    b.fillStyle = C('ink.0'); b.fillRect(win.x + 18, 70, 18, 4);
    b.fillStyle = C('slate.2'); b.fillRect(win.x + 19, 71, 16, 2);
    b.fillStyle = C('slate.3'); for (let i = 0; i < 7; i++) b.fillRect(win.x + 20 + i * 2, 71, 1, 1);

    // the timeline panel: header, the vision strip, V2, V1, text lane, render bar
    const P = { x: c0 + 86, y: 40, w: 68, h: 40 };
    b.fillStyle = C('#1f2230'); b.fillRect(P.x - 1, P.y - 1, P.w + 2, P.h + 2);
    b.fillStyle = C('#13151e'); b.fillRect(P.x, P.y, P.w, P.h);
    b.fillStyle = C('#1b1e2a'); b.fillRect(P.x, P.y, P.w, 4);
    for (let i = 0; i < 3; i++) { b.fillStyle = C('#2a2e3d'); b.fillRect(P.x + 2 + i * 4, P.y + 1, 2, 2); }
    for (let x = P.x + 3; x < P.x + P.w - 2; x += 4) { b.fillStyle = C('#2a2e3d'); b.fillRect(x, P.y + 4, 1, (x - P.x - 3) % 16 ? 1 : 2); }
    const lanes = { vision: P.y + 6, v2: P.y + 10, v1: P.y + 20, t: P.y + 32, bar: P.y + 37 };
    const lane = (y, hh, c) => { b.fillStyle = C(c); b.fillRect(P.x + 1, y, P.w - 2, hh); };
    lane(lanes.vision, 3, '#101118'); lane(lanes.v2, 8, '#101118'); lane(lanes.v1, 11, '#12131b'); lane(lanes.t, 4, '#101118');
    lane(lanes.bar, 2, '#0b0c12');
    // the panel's feet
    b.fillStyle = C('steel.1'); b.fillRect(P.x + 6, P.y + P.h + 1, 2, FLOOR - P.y - P.h - 1); b.fillRect(P.x + P.w - 8, P.y + P.h + 1, 2, FLOOR - P.y - P.h - 1);

    const cw = 16, x0 = P.x + 2;
    const slot = (k) => x0 + k * cw;
    const raw = [0, 1, 2, 3].map((i) => {
      const at = ORDER.indexOf(i);
      return { x: P.x + 1 + at * 17, y: 27 + [3, -2, 4, -1][at] };
    });
    const bots = [0, 1, 2, 3].map((i) => ({ x: P.x + 9 + i * 17, y: 19 }));
    const exit = hatch.x + 7;
    return {
      back, P, lanes, slot, cw, raw, bots, win,
      mark: c0 + 52,
      page: { x: c0 + 13, y: 12, w: 15, h: 20 },
      route: {
        enter: [exit, 0], via: [[exit, FLOOR]], act: [c0 + 52, FLOOR],
        leave: [[exit, FLOOR]], exit: [exit, h],
      },
    };
  },

  draw(ctx, f, B) {
    ctx.drawImage(B.back, 0, 0);
    drawPath(ctx, routePoints(B.route), { done: routeDone(B.route, f) });
    const { P, lanes, slot, cw } = B;
    const act = f.act;

    // the written vision: a ruled page that flies into the timeline's top strip
    const kv = ease.inOutCubic(span(CLIPS_AT[0], CLIPS_AT[0] + 0.14, act));
    const pg = B.page;
    if (kv < 1) {
      const x = Math.round(lerp(pg.x, P.x + 2, kv)), y = Math.round(lerp(pg.y, lanes.vision, kv));
      const pw = Math.round(lerp(pg.w, P.w - 4, kv)), ph = Math.max(3, Math.round(lerp(pg.h, 3, kv)));
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, pw + 2, ph + 2);
      ctx.fillStyle = C('white.1'); ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = C('white.2'); ctx.fillRect(x, y, pw, 1);
      if (ph > 8) {
        ctx.fillStyle = C('#c9b98f'); ctx.fillRect(x + pw - 4, y, 4, 4);
        const lens = [0.6, 0.9, 0.7, 0.82, 0.55];
        for (let i = 0; i < lens.length && 4 + i * 3 < ph - 2; i++) { ctx.fillStyle = C('slate.2'); ctx.fillRect(x + 2, y + 4 + i * 3, Math.round((pw - 5) * lens[i]), 1); }
      }
    } else {
      ctx.fillStyle = C('white.1'); ctx.fillRect(P.x + 2, lanes.vision, P.w - 4, 3);
      ctx.fillStyle = C('slate.2'); for (let x = P.x + 4; x < P.x + P.w - 4; x += 5) ctx.fillRect(x, lanes.vision + 1, 3, 1);
    }

    // raw clips, out of order above the timeline, drop into V1 in order
    for (let i = 0; i < 4; i++) {
      const k = ease.outBack(span(CLIPS_AT[0] + 0.05 + i * 0.05, CLIPS_AT[0] + 0.16 + i * 0.05, act));
      const r = B.raw[i];
      const x = lerp(r.x, slot(i), k), y = lerp(r.y, lanes.v1, k);
      drawClip(ctx, x + 1, y, cw - 1, 11, 'video', i);
      pips(ctx, x + 1, y, i + 1);
    }

    // the four agents: each wakes, beams to its lane, and its piece lands
    const ks = [0, 1, 2, 3].map((i) => agentK(act, i));
    // B-roll: a shot from the bot lands on V2 over clips 2–3
    if (ks[0] > 0) {
      const k = ease.inOutCubic(span(0.35, 1, ks[0]));
      const bx = B.bots[0].x, tx = slot(1) + 6;
      const x = lerp(bx - 5, tx, k), y = lerp(B.bots[0].y + 8, lanes.v2, k), cwid = Math.round(lerp(10, 20, k));
      if (ks[0] >= 0.35) drawClip(ctx, x, y, cwid, 8, 'video', 2);
    }
    // motion graphics: an fx clip on V2 and three keyframes plotted on an arc
    if (ks[1] > 0) {
      const fxw = Math.round(22 * ease.outCubic(span(0, 0.4, ks[1])));
      drawClip(ctx, slot(2) + 10, lanes.v2, fxw, 8, 'fx');
      const arc = (u) => [slot(2) + 6 + u * 24, 36 - Math.sin(u * Math.PI) * 5];
      const shown = span(0.3, 0.95, ks[1]);
      ctx.fillStyle = C('magenta.2');
      for (let u = 0; u <= shown; u += 0.06) { const [x, y] = arc(u); ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      [0, 0.5, 1].forEach((u, j) => { if (shown >= u * 0.98 && shown > 0) { const [x, y] = arc(u); diamond(ctx, Math.round(x), Math.round(y), j === 1 ? 'gold.2' : 'gold.3'); } });
    }
    // transitions: a dissolve set on the cut between clips 2 and 3
    if (ks[2] >= 0.45) bowtie(ctx, slot(2) + 1, lanes.v1 + 5);
    // on-screen text: a caption clip typed along the text lane
    if (ks[3] > 0) {
      const n = Math.floor(ks[3] * 14);
      const tw = n >= 14 ? cw * 4 - 1 : Math.min(cw * 4 - 1, 6 + n * 4);
      if (n > 0) {
        drawClip(ctx, slot(0) + 1, lanes.t, tw, 4, 'text');
        ctx.fillStyle = C('gold.0');
        for (let j = 0; j < Math.min(n, 13); j++) if (j % 4 !== 3) ctx.fillRect(slot(0) + 3 + j * 4, lanes.t + 2, 3, 1);
      }
    }
    // the bots last, over their beams
    B.bots.forEach((bot, i) => {
      const k = ks[i], on = k > 0, busy = k > 0 && k < 1;
      if (busy) {
        const tgt = [[slot(1) + 16, lanes.v2], [slot(2) + 18, 31], [slot(2) + 1, lanes.v1 + 1], [slot(0) + 6 + Math.floor(k * 14) * 4, lanes.t]][i];
        beam(ctx, bot.x, bot.y + 7, tgt[0], tgt[1], CLIP[KINDS[i]][3], span(0, 0.35, k));
      }
      drawAgent(ctx, bot.x, bot.y, KINDS[i], on, busy);
    });

    // render: the bar fills with the playhead riding its edge
    const kr = span(RENDER_AT[0], RENDER_AT[1], act);
    if (kr > 0) {
      const bw = Math.round((P.w - 4) * kr), done = kr >= 1;
      ctx.fillStyle = C(done ? 'green.2' : 'cyan.2'); ctx.fillRect(P.x + 2, lanes.bar, bw, 2);
      ctx.fillStyle = C(done ? 'green.3' : 'cyan.3'); ctx.fillRect(P.x + 2, lanes.bar, bw, 1);
      if (!done) {
        const px = P.x + 2 + bw;
        ctx.fillStyle = C('red.2'); ctx.fillRect(px, P.y + 5, 1, lanes.bar - P.y - 3);
        ctx.fillRect(px - 2, P.y + 3, 5, 2); ctx.fillRect(px - 1, P.y + 5, 3, 1);
      }
    }

    // the Vincio window plays the cut back once it's rendered
    if (kr >= 1) {
      const wn = B.win;
      scenePic(ctx, wn.x + 4, wn.y + 9, wn.w - 8, 8, 0);
      ctx.fillStyle = C('green.2'); ctx.fillRect(wn.x + 4, wn.y + 19, wn.w - 8, 2);
    } else if (f.phase === 'act') {
      const wn = B.win;                                   // a progress strip while the agents work
      ctx.fillStyle = C('slate.1'); ctx.fillRect(wn.x + 4, wn.y + 19, wn.w - 8, 2);
      ctx.fillStyle = C('cyan.2'); ctx.fillRect(wn.x + 4, wn.y + 19, Math.round((wn.w - 8) * act), 2);
    }

    f.drawHero();
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, B) {
    if (f.phase === 'act') return { pose: 'type', frame: Math.floor(f.act * 22) % 2, x: B.mark, y: FLOOR, facing: -1 };
    if (f.phase === 'hold') return { pose: f.hold < 0.4 && !f.reduced ? 'victory' : 'idle', frame: 0, x: B.mark, y: FLOOR, facing: 1 };
    return null;
  },

  labels(f, B) {
    const { P } = B, cx = P.x + P.w / 2;
    const act = f.act;
    if (f.phase === 'before' || act < CLIPS_AT[0] + 0.12) {
      return [
        { text: 'Raw clips', x: cx, y: 46, tone: 'cyan' },
        { text: 'Written vision', x: B.page.x + B.page.w / 2 + 6, y: 33 },
      ];
    }
    if (act < AGENT_AT[0]) return [];
    if (act < AGENT_AT[1]) {
      const i = Math.min(3, Math.floor((act - AGENT_AT[0]) / ((AGENT_AT[1] - AGENT_AT[0]) / 4)));
      return [{ text: NAMES[i][0], x: cx, y: 1, tone: NAMES[i][1] }];
    }
    const done = act >= 1;
    return [{ text: done ? 'final_cut.mp4 ✓' : 'final_cut.mp4', x: cx, y: 85, tone: done ? 'good' : 'plain' }];
  },

  // ─── T1: a steel cage elevator down to Oak Ridge ──────────────────
  // He drops through the hatch into the cage (10%), rides it down while
  // the cable pays out from the drum at the head of the shaft (80%), and
  // steps off at the bottom (10%). Guide rails and the drum sit on the
  // side away from the card.
  transit: {
    build({ w, h, from, to, side = 0, lane }) {
      const free = side ? -side : 1;
      const room = lane == null ? (side ? 20 : 0) : lane;
      const cx = Math.round(from[0]);
      // the drum sits towards the free side, but never past the clear lane on the card's side
      const drumX = side ? cx + free * 14 : cx + 12;
      const reach = side ? w / 2 + side * room : w;
      return { cx, from, to, top: 26, bottom: h - 1, drumX, side, free, reach: Math.min(reach, w) };
    },
    draw(ctx, g, B) {
      const { cx, top, bottom, h } = B;
      const k = cageK(g.s), y = Math.round(lerp(top, bottom, g.reduced ? 1 : k));
      const L = Math.max(4, y - 30);
      // guide rails, the whole height of the shaft
      for (const x of [cx - 11, cx + 10]) {
        ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, 0, 3, B.h);
        ctx.fillStyle = C('steel.2'); ctx.fillRect(x, 0, 1, B.h);
        ctx.fillStyle = C('steel.3'); for (let yy = 4; yy < B.h; yy += 12) ctx.fillRect(x - 1, yy, 3, 1);
      }
      // the drum at the head of the shaft: its spokes turn as the cable pays out
      const dx = B.drumX, dy = 6;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(dx - 5, dy - 5, 11, 11);
      ctx.fillStyle = C('steel.2'); ctx.fillRect(dx - 4, dy - 4, 9, 9);
      ctx.fillStyle = C('steel.4'); ctx.fillRect(dx - 4, dy - 4, 9, 1);
      const turn = Math.floor((g.reduced ? 0 : L) / 3) % 4;
      ctx.fillStyle = C('steel.1');
      if (turn === 0) ctx.fillRect(dx - 3, dy, 7, 1); else if (turn === 2) ctx.fillRect(dx, dy - 3, 1, 7);
      else for (let i = -3; i <= 3; i++) ctx.fillRect(dx + (turn === 1 ? i : -i), dy + i, 1, 1);
      ctx.fillStyle = C('ink.0'); ctx.fillRect(dx - 1, dy - 1, 3, 3);
      // the cable: over to the shaft's centre, then down to the cage's yoke
      const yoke = y - 29;
      ctx.fillStyle = C('slate.3');
      ctx.fillRect(Math.min(dx, cx), dy - 4, Math.abs(dx - cx) + 1, 1);
      ctx.fillRect(cx, dy - 4, 1, Math.max(0, yoke - dy + 4));
      // the cage: floor plate, corner posts, a mesh back, and its yoke
      const x0 = cx - 9, cw = 19;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x0 - 1, yoke - 1, cw + 2, 3); ctx.fillRect(x0 - 1, y, cw + 2, 5);
      ctx.fillStyle = C('steel.3'); ctx.fillRect(x0, yoke, cw, 1);
      ctx.fillStyle = C('#1b2233'); for (let yy = yoke + 3; yy < y; yy += 3) ctx.fillRect(x0 + 1, yy, cw - 2, 1);
      ctx.fillStyle = C('#1b2233'); for (let xx = x0 + 3; xx < x0 + cw - 1; xx += 3) ctx.fillRect(xx, yoke + 1, 1, y - yoke - 1);
      for (const px of [x0, x0 + cw - 1]) { ctx.fillStyle = C('ink.0'); ctx.fillRect(px - 1, yoke, 3, y - yoke); ctx.fillStyle = C('steel.3'); ctx.fillRect(px, yoke, 1, y - yoke); }
      ctx.fillStyle = C('steel.3'); ctx.fillRect(x0, y, cw, 3);
      ctx.fillStyle = C('steel.4'); ctx.fillRect(x0, y, cw, 1);
      ctx.fillStyle = C('gold.2'); for (let xx = x0 + 1; xx < x0 + cw; xx += 4) ctx.fillRect(xx, y + 2, 2, 1);
      // the landing at the bottom
      ctx.fillStyle = C('ink.0'); ctx.fillRect(cx - 16, h - 2, 6, 2); ctx.fillRect(cx + 11, h - 2, 6, 2);
      ctx.fillStyle = C('steel.3'); ctx.fillRect(cx - 15, h - 2, 4, 1); ctx.fillRect(cx + 12, h - 2, 4, 1);
    },
    hero(g, B) {
      const { cx, top, bottom, from, to } = B;
      const s = g.s, f = g.dir < 0 ? -1 : 1;
      if (s < 0.1) {                                       // drop through the hatch into the cage
        const u = s / 0.1;
        return { pose: g.dir < 0 ? 'jump' : u < 0.15 ? 'jump' : 'fall', frame: 0, x: lerp(from[0], cx, u), y: lerp(from[1], top, u * u), facing: f };
      }
      const y = lerp(top, bottom, cageK(s));
      if (s < 0.9) return { pose: s < 0.14 ? 'crouch' : 'lookDown', frame: 0, x: cx, y, facing: B.free };
      const u = (s - 0.9) / 0.1;                           // step off onto the landing
      return { pose: g.still ? 'idle' : 'run', frame: Math.floor(u * 4) % 4, x: lerp(cx, to[0], u), y: lerp(y, to[1], u), facing: to[0] >= cx ? f : -f };
    },
  },
};

// the cage's travel: still for the first and last tenth, eased in between
function cageK(s) { return ease.inOutCubic(span(0.1, 0.9, s)); }

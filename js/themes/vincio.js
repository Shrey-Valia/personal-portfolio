// Vincio Studio: the level is a video timeline. The ground is a run of
// video clips with thumbnail frames on a charcoal editor; one-way
// platforms are audio clips; a playhead sweeps the backdrop.
//
// Set pieces (all prefixed vincio.):
//   cut       raw clips plus a written vision snap into a finished cut (p-vincio-1)
//   broll     the B-roll agent picks one clip from the bin to bridge a gap
//   motion    the motion agent keyframes a shape layer into a lift
//   dissolve  the transition agent cross-dissolves a hard cut out of the way
//   caption   the text agent types on-screen text you can walk on
//   backstage the stack behind the editor: database, agent layer and
//             memory, auth, front end; it powers up on p-vincio-3
//   render    the export bar over the goal
//   label     a short caption that can change once a fact is logged
// The four agents wake up when p-vincio-2 is logged.

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSkin } from '../art/sprites/actors.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { registerEnemy, Hopper } from '../game/enemies.js';
import { registerSong, steps } from '../engine/audio.js';
import { drawText, textWidth } from '../art/font.js';
import { stripedSky, pill, line, bayer } from '../art/draw.js';
import { SOLID } from '../engine/tilemap.js';
import { Goal, Floater } from '../game/objects.js';
import { clamp, lerp, ease, rng, hash2, makeCanvas } from '../engine/util.js';

const C = (r) => col(r);
const T = TILE;
const INK = '#0b0d17';

// timeline clip colours by track kind: dark, body, header, highlight
const CLIP = {
  video: ['cyan.0', 'cyan.1', 'cyan.2', 'cyan.3'],
  audio: ['green.0', 'green.1', 'green.2', 'green.3'],
  text: ['gold.0', 'gold.1', 'gold.2', 'gold.3'],
  fx: ['magenta.0', 'magenta.1', 'magenta.2', 'magenta.3'],
  trans: ['slate.1', 'slate.2', 'slate.3', 'white.1'],
  off: ['slate.0', 'slate.1', 'slate.2', 'slate.3'],
};
const TEXT_COL = { video: '#a8ecff', audio: '#90eaa8', text: '#ffe08a', fx: '#ff86d0', trans: '#e3e6ee' };

// footage in the thumbnails: sky, land, light
const SCENES = [
  ['#f2a65a', '#7c3f4f', '#ffe08a'],   // sunset over hills
  ['#63b8de', '#1f5f6e', '#e3f6ff'],   // coastline
  ['#5b4fa8', '#221c45', '#ffd27a'],   // city at night
  ['#9ccf73', '#3d6b2e', '#fbf8f1'],   // a park at noon
];

function scenePic(ctx, x, y, w, h, s) {
  const [sky, land, light] = SCENES[s % SCENES.length];
  ctx.fillStyle = C(sky); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C(light);
  if (w >= 40) {                                           // a proper sun on big frames
    const r = Math.round(h * 0.12), cx = x + Math.round(w * 0.66), cy = y + Math.round(h * 0.34);
    for (let j = -r; j <= r; j++) { const half = Math.floor(Math.sqrt(r * r - j * j)); ctx.fillRect(cx - half, cy + j, half * 2 + 1, 1); }
  } else {
    ctx.fillRect(x + Math.round(w * 0.62), y + Math.max(0, Math.round(h * 0.2)), Math.max(1, w >> 3), Math.max(1, h >> 3));
  }
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
  if (scene >= 0 && h >= 10) {
    for (let fx = x + 2; fx + 10 <= x + w - 1; fx += 12) {
      ctx.fillStyle = C('ink.0'); ctx.fillRect(fx - 1, y + 4, 12, h - 6);
      scenePic(ctx, fx, y + 5, 10, h - 8, scene);
    }
  }
}

const label = (ctx, text, x, y, color = '#e3e6ee', size = 6.5) =>
  drawText(ctx, text, x, y, color, { align: 'center', shadow: INK, size });

// ─── terrain: video clips on V1 over the charcoal timeline ───────────

function lastCut(tx) { let i = tx; while (i > 0 && hash2(i, 5) >= 0.24) i--; return i; }

function studioKit() {
  const P = {
    a: C('#171922'), b: C('#1a1c27'), lane: C('#111219'), edge: C('#2a2e3d'), seam: C('ink.0'),
    vd: C('cyan.0'), vb: C('cyan.1'), vm: C('cyan.2'), vl: C('cyan.3'),
    ad: C('green.0'), ab: C('green.1'), am: C('green.2'), al: C('green.3'),
  };
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.fillStyle = ty & 1 ? P.b : P.a; ctx.fillRect(x, y, 16, 16);
      hline(ctx, x, y + 15, 16, P.lane);                    // track lanes
      if (!(m & 1)) {
        const start = lastCut(tx);
        ctx.fillStyle = P.vb; ctx.fillRect(x, y, 16, 12);
        hline(ctx, x, y, 16, P.vl);
        ctx.fillStyle = P.vm; ctx.fillRect(x, y + 1, 16, 2);
        ctx.fillStyle = P.seam; ctx.fillRect(x + 2, y + 4, 12, 6);
        scenePic(ctx, x + 3, y + 5, 10, 4, Math.floor(hash2(start, 9) * SCENES.length));
        hline(ctx, x, y + 11, 16, P.vd);
        hline(ctx, x, y + 12, 16, P.seam);
        if (start === tx && (m & 8)) {                       // a cut between two clips
          vline(ctx, x, y, 12, P.seam); vline(ctx, x + 1, y + 1, 10, P.vd);
        }
      }
      if (!(m & 8)) { vline(ctx, x, y, 16, P.edge); if (!(m & 1)) vline(ctx, x, y, 12, P.vl); }
      if (!(m & 2)) vline(ctx, x + 15, y, 16, P.seam);
      if (!(m & 4)) hline(ctx, x, y + 15, 16, P.seam);
    },
    // one-way platforms are audio clips with a waveform
    oneway(ctx, x, y, joinL, joinR, tx, ty) {
      ctx.fillStyle = P.seam; ctx.fillRect(x, y, 16, 9);
      const l = joinL ? 0 : 1, r = joinR ? 16 : 15;
      ctx.fillStyle = P.ab; ctx.fillRect(x + l, y, r - l, 8);
      hline(ctx, x + l, y, r - l, P.al);
      hline(ctx, x + l, y + 7, r - l, P.ad);
      for (let i = l + 1; i < r - 1; i++) {
        const a = 1 + Math.floor(Math.abs(Math.sin((tx * 16 + i) * 0.9)) * 2.4 * (0.4 + hash2(tx * 16 + i, ty)));
        vline(ctx, x + i, y + 4 - a, a * 2 - 1, P.am);
      }
    },
    animated(ctx, ch, x, y, t) {
      if (ch === '^') {                                     // a render error: flickering red frame
        ctx.fillStyle = P.seam; ctx.fillRect(x, y + 8, 16, 8);
        ctx.fillStyle = (t >> 3) & 1 ? C('red.2') : C('red.1');
        for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 4, y + 6 + (i & 1) * 2, 3, 3);
      }
    },
  };
}

// Backstage: server-room floor plates with a teal status strip
function backstageKit() {
  const P = {
    fill: C('#10142a'), fill2: C('#131833'), seam: C('ink.0'), plate: C('slate.2'), hi: C('slate.3'),
    lo: C('slate.1'), led: C('teal.3'), dim: C('teal.1'),
  };
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.fillStyle = (tx + ty) & 1 ? P.fill : P.fill2; ctx.fillRect(x, y, 16, 16);
      if (tx % 2 === 0) vline(ctx, x, y, 16, P.seam);
      if (ty % 2 === 1) hline(ctx, x, y + 15, 16, P.seam);
      if (!(m & 1)) {
        ctx.fillStyle = P.plate; ctx.fillRect(x, y, 16, 6);
        hline(ctx, x, y, 16, P.hi);
        hline(ctx, x, y + 6, 16, P.seam);
        for (let i = 2; i < 16; i += 4) px(ctx, x + i, y + 3, (tx + i) % 3 ? P.dim : P.led);
      }
      if (!(m & 8)) vline(ctx, x, y, 16, P.lo);
      if (!(m & 2)) vline(ctx, x + 15, y, 16, P.seam);
      if (!(m & 4)) hline(ctx, x, y + 15, 16, P.seam);
    },
    oneway(ctx, x, y, joinL, joinR) {
      ctx.fillStyle = P.plate; ctx.fillRect(x, y, 16, 4);
      hline(ctx, x, y, 16, P.hi); hline(ctx, x, y + 4, 16, P.seam);
      if (!joinL) vline(ctx, x, y, 5, P.seam);
      if (!joinR) vline(ctx, x + 15, y, 5, P.seam);
    },
    animated() {},
  };
}

registerKit('studio', studioKit());
registerKit('studioDark', backstageKit());

// ─── backdrop: the editor UI, its timeline, and a sweeping playhead ──

function studioBackdrop(W) {
  const sky = strip(W, (ctx) => stripedSky(ctx, W, H, ['#0a0b11', '#0e1017', '#12141d', '#161923']));

  // far: media bin, program monitor, inspector
  const panels = strip(720, (ctx) => {
    const frame = (x, y, w, h) => {
      ctx.fillStyle = C('#1f2230'); ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = C('#13151e'); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C('#1b1e2a'); ctx.fillRect(x, y, w, 7);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = C('#2a2e3d'); ctx.fillRect(x + 4 + i * 5, y + 2, 3, 3); }
    };
    // media bin: a grid of dim thumbnails
    frame(24, 34, 150, 78);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const tx = 32 + c * 35, ty = 48 + r * 30;
      ctx.fillStyle = C('#0b0c12'); ctx.fillRect(tx - 1, ty - 1, 30, 20);
      scenePic(ctx, tx, ty, 28, 18, (r * 4 + c) % 4);
      ctx.fillStyle = 'rgba(19,21,30,0.62)'; ctx.fillRect(tx, ty, 28, 18);
    }
    // program monitor: the cut playing back, kept dim behind the action
    frame(222, 26, 168, 104);
    ctx.fillStyle = C('#0b0c12'); ctx.fillRect(228, 37, 156, 82);
    scenePic(ctx, 230, 39, 152, 78, 0);
    ctx.fillStyle = 'rgba(12,13,19,0.74)'; ctx.fillRect(230, 39, 152, 78);
    ctx.fillStyle = C('#2a2e3d'); ctx.fillRect(230, 124, 152, 2);
    ctx.fillStyle = C('#5a1a20'); ctx.fillRect(230, 124, 54, 2);
    // inspector: slider rows
    frame(452, 40, 128, 76);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = C('#22263a'); ctx.fillRect(462, 56 + i * 11, 108, 2);
      ctx.fillStyle = C('#3a4058'); ctx.fillRect(462 + ((i * 37) % 90), 54 + i * 11, 4, 6);
    }
    // a second, smaller bin further on
    frame(612, 52, 96, 60);
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = C('#0b0c12'); ctx.fillRect(621 + c * 42, 67, 36, 24);
      scenePic(ctx, 622 + c * 42, 68, 34, 22, 2 + c);
      ctx.fillStyle = 'rgba(19,21,30,0.62)'; ctx.fillRect(622 + c * 42, 68, 34, 22);
    }
  });

  // mid: the timeline itself, ruler and four lanes of dim clips
  const LANES = [['video', 124], ['video', 138], ['audio', 152], ['audio', 166]];
  const tracks = strip(640, (ctx, w) => {
    const r = rng(77);
    ctx.fillStyle = C('#14161f'); ctx.fillRect(0, 110, w, 8);
    for (let x = 0; x < w; x += 8) { ctx.fillStyle = C('#2a2e3d'); ctx.fillRect(x, x % 40 ? 115 : 112, 1, x % 40 ? 3 : 6); }
    for (const [kind, y] of LANES) {
      ctx.fillStyle = C(y % 28 === 12 ? '#12131b' : '#101118'); ctx.fillRect(0, y - 4, w, 14);
      let x = Math.floor(r() * 30);
      while (x < w - 20) {
        const cw = 40 + Math.floor(r() * 90);
        const end = Math.min(w - 4, x + cw);
        const video = kind === 'video';
        ctx.fillStyle = C(video ? '#1a2a40' : '#172b20'); ctx.fillRect(x, y - 2, end - x, 11);
        ctx.fillStyle = C(video ? '#22385a' : '#1f3a2a'); ctx.fillRect(x, y - 2, end - x, 2);
        if (!video) {
          for (let i = x + 2; i < end - 2; i++) {
            const a = 1 + Math.floor(Math.abs(Math.sin(i * 0.7) * Math.sin(i * 0.13)) * 3);
            ctx.fillStyle = C('#244a33'); ctx.fillRect(i, y + 4 - a, 1, a * 2);
          }
        } else {
          for (let i = x + 3; i + 8 < end; i += 12) { ctx.fillStyle = C('#203350'); ctx.fillRect(i, y + 2, 9, 5); }
        }
        x = end + 6 + Math.floor(r() * 40);
      }
    }
  });

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, panels, camX, 0.08 * k, -camY * 0.1);
      const oy = -camY * 0.2;
      blitStrip(ctx, tracks, camX, 0.25 * k, oy);
      // lane names ride with the lanes
      const off = -Math.floor(camX * 0.25 * k) % 320;
      for (let x = off; x < ctx.W + 320; x += 320) {
        ['V2', 'V1', 'A1', 'A2'].forEach((n, i) => drawText(ctx, n, x + 6, LANES[i][1] - 3 + oy, '#4a5068', { size: 6 }));
      }
      // the playhead sweeps the timeline
      const span = ctx.W + 80;
      const p = reduced ? ctx.W * 0.7 : (((t * 0.45) % span) + span) % span - 40;
      const x = Math.round(p);
      ctx.fillStyle = 'rgba(224,57,63,0.55)'; ctx.fillRect(x, 116 + oy, 1, H);
      ctx.fillStyle = C('red.2');
      ctx.fillRect(x - 3, 109 + oy, 7, 4); ctx.fillRect(x - 2, 113 + oy, 5, 1); ctx.fillRect(x - 1, 114 + oy, 3, 1);
    },
  };
}

// Backstage: racks, cable trays, status lights
function backstageBackdrop(W) {
  const bg = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#080a16', '#0c1022', '#10152c']);
    const r = rng(5);
    for (let x = 8; x < W; x += 44) {
      ctx.fillStyle = C('#0f1430'); ctx.fillRect(x, 20, 34, 160);
      ctx.fillStyle = C('#161c3c'); ctx.fillRect(x, 20, 34, 1);
      for (let y = 26; y < 176; y += 6) {
        ctx.fillStyle = C('#131938'); ctx.fillRect(x + 3, y, 28, 4);
        if (r() < 0.5) { ctx.fillStyle = C(r() < 0.7 ? '#1f5f6e' : '#5c3570'); ctx.fillRect(x + 26, y + 1, 2, 2); }
      }
    }
    ctx.fillStyle = C('#151a36'); ctx.fillRect(0, 14, W, 3);
  });
  return { draw(ctx) { ctx.drawImage(bg, 0, 0); } };
}

registerBackground('studio', studioBackdrop);
registerBackground('studioDark', backstageBackdrop);

// ─── bugs: an orange glitch beetle and a hopping dropped frame ───────

registerSkin('studio', { d: 'orange.1', b: 'orange.2', c: 'orange.3', t: 'white.2', e: 'white.2', o: 'ink.0', l: 'slate.3' });

// a dropped frame: a blank film frame with a red slash where the picture should be
class DroppedFrame extends Hopper {
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    if (this.flat) {
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y + 8, 14, 4);
      ctx.fillStyle = C('slate.3'); ctx.fillRect(x, y + 9, 12, 2);
      return;
    }
    const c = this.grounded && this.wait < 12 ? 1 : 0;       // crouch before a hop
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1 + c, 14, 14 - c);
    ctx.fillStyle = C('slate.3'); ctx.fillRect(x, y + c, 12, 12 - c);
    ctx.fillStyle = C('white.1'); ctx.fillRect(x, y + c, 12, 1);
    for (let i = 0; i < 3; i++) {                            // sprocket holes
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 1, y + 2 + i * 3 + c, 1, 2); ctx.fillRect(x + 10, y + 2 + i * 3 + c, 1, 2);
    }
    ctx.fillStyle = C('#05060c'); ctx.fillRect(x + 3, y + 2 + c, 6, 8 - c);
    ctx.fillStyle = C('red.2');
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + i, y + 8 - Math.round(i * (6 - c) / 6) + c, 1, 1);
    // eyes in the empty frame
    ctx.fillStyle = C('white.2'); ctx.fillRect(x + 4, y + 4 + c, 1, 2); ctx.fillRect(x + 7, y + 4 + c, 1, 2);
  }
}
registerEnemy('q', DroppedFrame);

// ─── small helpers shared by set pieces ─────────────────────────────

class Label {
  constructor(tx, ty, spec, level) {
    this.x = tx * T + (spec.dx ?? 8); this.y = ty * T + (spec.dy ?? 0);
    this.spec = spec; this.level = level;
  }
  back(ctx, cam) {
    const s = this.spec;
    const done = s.fact && this.level.game.progress.hasFact(s.fact);
    label(ctx, done ? s.done : s.text, this.x - cam.x, this.y - cam.y, done ? '#90eaa8' : (s.color || '#c9d1e6'), s.size || 7);
  }
}

// a hovering edit bot: screen face, antenna, a thruster when awake
function drawAgent(ctx, x, y, t, kind, on, phase = 0) {
  x = Math.round(x);
  y = Math.round(y + (on ? Math.sin(t / 18 + phase) * 2 : 0));
  const [d, b, m, l] = CLIP[on ? kind : 'off'].map(C);
  if (on && ((t + phase * 9) >> 2) & 1) { ctx.fillStyle = C('gold.3'); ctx.fillRect(x - 2, y + 8, 4, 2); }
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 8, y - 6, 16, 13); ctx.fillRect(x - 7, y - 7, 14, 15);
  ctx.fillStyle = b; ctx.fillRect(x - 7, y - 6, 14, 13);
  ctx.fillStyle = l; ctx.fillRect(x - 6, y - 6, 12, 1);
  ctx.fillStyle = d; ctx.fillRect(x - 7, y + 6, 14, 1);
  ctx.fillStyle = C('#0f1430'); ctx.fillRect(x - 5, y - 4, 10, 7);
  if (on) {
    if ((t + phase * 40) % 150 > 5) { ctx.fillStyle = C('white.2'); ctx.fillRect(x - 3, y - 2, 2, 3); ctx.fillRect(x + 1, y - 2, 2, 3); }
  } else {
    ctx.fillStyle = C('slate.2'); ctx.fillRect(x - 3, y, 2, 1); ctx.fillRect(x + 1, y, 2, 1);
  }
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 11, 2, 4);
  ctx.fillStyle = on ? m : C('slate.2'); ctx.fillRect(x - 1, y - 12, 2, 2);
  return y;
}

// a dotted beam from an agent to whatever it is working on
function beam(ctx, x0, y0, x1, y1, color, t) {
  const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 4));
  ctx.fillStyle = C(color);
  for (let i = 0; i <= n; i++) {
    if ((i + (t >> 2)) % 2) continue;
    ctx.fillRect(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), 1, 1);
  }
}

// ─── p-vincio-1: raw clips + a written vision → a finished cut ──────

class Cut {
  constructor(tx, ty, spec, level) {
    this.fact = spec.fact;
    this.cw = (spec.w || 2) * T;
    this.n = spec.clips || 4;
    this.x0 = tx * T; this.y0 = ty * T;
    const order = spec.order || [2, 0, 3, 1];
    const r = rng(tx * 13 + 5);
    this.clips = [];
    for (let i = 0; i < this.n; i++) {
      const at = order.indexOf(i);
      const c = {
        i, hx: this.x0 + at * this.cw + (r() - 0.5) * 10, hy: this.y0 + 14 + r() * 18, ph: r() * 6,
        tx: this.x0 + i * this.cw, p: 0,
      };
      c.plat = platform(c.tx, this.y0, this.cw, 6, false);
      level.platforms.push(c.plat);
      this.clips.push(c);
    }
    const [vx, vy, vw, vh] = spec.vision;
    this.note = { x: (tx + vx) * T, y: (ty + vy) * T, w: vw * T, h: vh * T };
    this.on = level.game.progress.hasFact(this.fact);
    this.t = this.on ? 999 : 0;
    this.played = this.on;
  }
  onFact(id, level) { if (id === this.fact) { this.on = true; this.t = 0; level.sfx('build'); } }
  update(level) {
    if (!this.on) return;
    this.t++;
    this.clips.forEach((c, k) => {
      c.p = clamp((this.t - 16 - k * 12) / 30, 0, 1);
      if (c.p >= 1 && !c.plat.active) { c.plat.active = true; level.sfx('tick'); }
    });
    if (!this.played && this.clips.every((c) => c.p >= 1)) {
      this.played = true; this.sweep = 0;
      level.sfx('checkpoint');
      level.floaters.push(new Floater(this.x0 + this.n * this.cw / 2, this.y0 - 22, 'Finished cut', '#a8ecff', 70));
    }
    if (this.sweep !== undefined && this.sweep < 1) this.sweep += 1 / 70;
  }
  back(ctx, cam, t) {
    // the written vision: a script page with ruled lines
    const n = this.note, x = n.x - cam.x, y = n.y - cam.y;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, n.w + 2, n.h + 2);
    ctx.fillStyle = C('white.1'); ctx.fillRect(x, y, n.w, n.h);
    ctx.fillStyle = C('white.2'); ctx.fillRect(x, y, n.w, 1);
    ctx.fillStyle = C('#c9b98f'); ctx.fillRect(x + n.w - 6, y, 6, 6);
    drawText(ctx, 'Written vision', x + 5, y + 2, '#1b1e2b', { size: 6.5, weight: 700 });
    const lens = [0.9, 0.7, 0.82, 0.55, 0.74];
    for (let i = 0; i < lens.length; i++) {
      const ly = y + 16 + i * 6;
      if (ly > y + n.h - 4) break;
      ctx.fillStyle = C('slate.2'); ctx.fillRect(x + 5, ly, Math.round((n.w - 10) * lens[i]), 1);
    }
    // its post, down to the floor
    ctx.fillStyle = C('slate.1'); ctx.fillRect(x + n.w / 2 - 1, y + n.h + 1, 2, this.y0 - (n.y + n.h) - 1);
  }
  draw(ctx, cam, t) {
    const cx = this.x0 + (this.n * this.cw) / 2 - cam.x;
    const built = this.clips.every((c) => c.p >= 1);
    if (!this.on) label(ctx, 'Raw clips', cx, this.y0 - 20 - cam.y, '#a8ecff', 7);
    for (const c of this.clips) {
      const k = ease.outBack(c.p);
      const bob = (1 - c.p) * Math.sin(t / 16 + c.ph) * 2;
      const x = lerp(c.hx, c.tx, k) - cam.x, y = lerp(c.hy, this.y0, k) + bob - cam.y;
      drawClip(ctx, x + 1, y, this.cw - 2, 12, 'video', c.i);
      drawText(ctx, String(c.i + 1), x + 4, y + 1, '#fbf8f1', { size: 6, shadow: INK, weight: 700 });
    }
    // once assembled, a playhead previews the cut
    if (built && this.sweep !== undefined && this.sweep < 1) {
      const px2 = Math.round(this.x0 + this.sweep * this.n * this.cw - cam.x);
      ctx.fillStyle = C('red.2'); ctx.fillRect(px2, this.y0 - 6 - cam.y, 1, 20);
      ctx.fillRect(px2 - 2, this.y0 - 8 - cam.y, 5, 3);
    }
  }
}

// ─── the four agents (p-vincio-2) ───────────────────────────────────
// Each hovers by its obstacle and starts work once agents are online and
// the hero comes near. Finished work persists in level.state.built.

class Agent {
  constructor(tx, ty, spec, level, key, kind) {
    this.key = key; this.kind = kind; this.spec = spec; this.level = level;
    this.fact = spec.fact;
    this.name = spec.name;
    this.ax = (tx + spec.agent[0]) * T + 8; this.ay = (ty + spec.agent[1]) * T + 8;
    this.trigger = (tx + (spec.trigger ?? -4)) * T;
    this.done = level.state.built.has(key);
    this.job = this.done ? 9999 : -1;
    this.phase = tx % 7;
  }
  online(level) { return level.game.progress.hasFact(this.fact); }
  tick(level) {
    if (this.job < 0) {
      const h = level.hero;
      if (this.online(level) && h.x + h.w > this.trigger) { this.job = 0; level.sfx('build'); }
    } else this.job++;
  }
  finish(level, text) {
    if (this.done) return;
    this.done = true;
    level.state.built.add(this.key);
    level.floaters.push(new Floater(this.ax, Math.max(44, this.ay - 30), text, TEXT_COL[this.kind], 70));
  }
  drawSelf(ctx, cam, t) {
    const on = this.online(this.level);
    const y = drawAgent(ctx, this.ax - cam.x, this.ay - cam.y, t, this.kind, on, this.phase);
    label(ctx, this.name, this.ax - cam.x, this.ay - cam.y - 26, on ? TEXT_COL[this.kind] : '#727b96');
    return y + cam.y;
  }
}

// B-roll selection: scan the bin, pick a shot, drop it into the gap
class BRoll extends Agent {
  constructor(tx, ty, spec, level, key) {
    super(tx, ty, spec, level, key, 'video');
    this.x0 = tx * T; this.y0 = ty * T; this.w = spec.w * T;
    this.bin = { x: (tx + spec.bin[0]) * T, y: (ty + spec.bin[1]) * T, n: 4 };
    this.pick = spec.pick ?? 2;
    this.plat = platform(this.x0, this.y0, this.w, 6, this.done);
    level.platforms.push(this.plat);
  }
  thumb(i) { return { x: this.bin.x + 6 + i * 26, y: this.bin.y + 12, w: 22, h: 14 }; }
  update(level) {
    this.tick(level);
    if (this.done) return;
    if (this.job === 60) level.sfx('tick');
    if (this.job >= 104) { this.plat.active = true; this.finish(level, 'B-roll selected'); }
  }
  back(ctx, cam, t) {
    const b = this.bin, x = b.x - cam.x, y = b.y - cam.y, w = 10 + b.n * 26;
    pill(ctx, x, y, w, 32, '#121522', '#2c3566', 3);
    drawText(ctx, 'B-roll bin', x + 5, y + 1, '#a8ecff', { size: 6.5 });
    for (let i = 0; i < b.n; i++) {
      const r = this.thumb(i);
      ctx.fillStyle = C('ink.0'); ctx.fillRect(r.x - cam.x - 1, r.y - cam.y - 1, r.w + 2, r.h + 2);
      if (i === this.pick && this.job >= 70) {                   // the picked shot has left the bin
        ctx.fillStyle = C('#1a1c27'); ctx.fillRect(r.x - cam.x, r.y - cam.y, r.w, r.h);
        continue;
      }
      scenePic(ctx, r.x - cam.x, r.y - cam.y, r.w, r.h, (i + 1) % 4);
    }
  }
  draw(ctx, cam, t) {
    const j = this.job;
    const ay = this.drawSelf(ctx, cam, t);
    // scanning, then the pick
    if (!this.done && j >= 0 && j < 70) {
      const i = j < 56 ? Math.floor(j / 7) % this.bin.n : this.pick;
      const r = this.thumb(i);
      beam(ctx, this.ax - cam.x, ay - cam.y + 4, r.x + r.w / 2 - cam.x, r.y + r.h - cam.y, 'cyan.3', t);
      ctx.fillStyle = C(j >= 56 ? 'green.3' : 'cyan.3');
      const x = r.x - cam.x - 2, y = r.y - cam.y - 2;
      ctx.fillRect(x, y, r.w + 4, 1); ctx.fillRect(x, y + r.h + 3, r.w + 4, 1);
      ctx.fillRect(x, y, 1, r.h + 4); ctx.fillRect(x + r.w + 3, y, 1, r.h + 4);
      if (j >= 56) label(ctx, 'Selected', r.x + r.w / 2 - cam.x, r.y - 11 - cam.y, '#90eaa8', 6.5);
    }
    // the shot flies down into the gap and becomes the bridge
    if (j >= 70) {
      const k = this.done ? 1 : ease.inOutCubic(clamp((j - 70) / 34, 0, 1));
      const r = this.thumb(this.pick);
      const x = lerp(r.x, this.x0, k), y = lerp(r.y, this.y0, k), w = lerp(r.w, this.w, k), h = lerp(r.h, 12, k);
      drawClip(ctx, x - cam.x + 1, y - cam.y, w - 2, Math.round(h), 'video', (this.pick + 1) % 4);
    }
  }
}

// Motion graphics: keyframes on an S-curve, a shape layer eased between them
class Motion extends Agent {
  constructor(tx, ty, spec, level, key) {
    super(tx, ty, spec, level, key, 'fx');
    this.w = spec.w * T;
    this.p0 = { x: (tx + spec.from[0]) * T, y: (ty + spec.from[1]) * T };
    // to[0] is the column of the wall the lift docks against, flush, at the ledge top
    this.wallX = (tx + spec.to[0]) * T;
    this.p3 = { x: this.wallX - this.w, y: (ty + spec.to[1]) * T };
    this.plat = platform(this.p0.x, this.p0.y, this.w, 6);
    level.platforms.push(this.plat);
    this.ct = 0;
  }
  at(k) {
    const { p0, p3 } = this;
    const u = 1 - k, s = 3 * k * k - 2 * k * k * k;
    // y eases with the bezier's ends held vertical; x swings across mid-way
    const y = u * u * u * p0.y + 3 * u * u * k * ((p0.y + p3.y) / 2) + 3 * u * k * k * ((p0.y + p3.y) / 2) + k * k * k * p3.y;
    return { x: lerp(p0.x, p3.x, s), y };
  }
  update(level) {
    this.tick(level);
    if (!this.done && this.job >= 50) this.finish(level, 'Keyframes set');
    let k = 0;
    if (this.done) {
      const c = this.ct++ % 330;
      k = c < 70 ? 0 : c < 160 ? ease.inOutCubic((c - 70) / 90) : c < 240 ? 1 : 1 - ease.inOutCubic((c - 240) / 90);
    }
    const p = this.at(k), pl = this.plat;
    pl.prevX = pl.x; pl.prevY = pl.y;
    pl.x = Math.round(p.x); pl.y = Math.round(p.y);
    // the lift drifts toward the wall as it rises: never carry a rider into the wall face
    const h = level.hero, dx = pl.x - pl.prevX;
    if (h.ground === pl && pl.y > this.p3.y && h.x + h.w + dx > this.wallX) h.x = this.wallX - h.w - dx;
  }
  back(ctx, cam, t) {
    // the motion path, drawn in as the keyframes are set
    const shown = this.done ? 1 : this.job < 0 ? 0 : clamp(this.job / 40, 0, 1);
    if (shown <= 0) return;
    ctx.fillStyle = C('magenta.2');
    for (let i = 0; i <= 40 * shown; i++) {
      if (i % 2) continue;
      const p = this.at(i / 40);
      ctx.fillRect(Math.round(p.x + this.w / 2 - cam.x), Math.round(p.y + 3 - cam.y), 1, 1);
    }
    [0, 0.5, 1].forEach((k, i) => {
      if (shown < k * 0.95) return;
      const p = this.at(k);
      diamond(ctx, Math.round(p.x + this.w / 2 - cam.x), Math.round(p.y + 3 - cam.y), i === 1 ? 'gold.2' : 'gold.3');
    });
  }
  draw(ctx, cam, t) {
    const pl = this.plat;
    drawClip(ctx, pl.x - cam.x + 1, pl.y - cam.y, this.w - 2, 9, 'fx');
    ctx.fillStyle = C('magenta.3'); ctx.fillRect(pl.x - cam.x + this.w / 2 - 6, pl.y - cam.y + 4, 12, 2);
    const ay = this.drawSelf(ctx, cam, t);
    if (!this.done && this.job >= 0) beam(ctx, this.ax - cam.x, ay - cam.y + 4, pl.x + this.w / 2 - cam.x, pl.y - cam.y, 'magenta.3', t);
  }
}

function diamond(ctx, x, y, c) {
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillRect(x - 1, y - 3, 3, 7);
  ctx.fillStyle = C(c); ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x, y - 2, 1, 5);
}

// Transitions: a hard cut between two clips, cross-dissolved away
class Dissolve extends Agent {
  constructor(tx, ty, spec, level, key) {
    super(tx, ty, spec, level, key, 'trans');
    this.tx = tx; this.ty = ty; this.tw = spec.w; this.th = spec.h;
    this.x = tx * T; this.y = ty * T; this.w = spec.w * T; this.h = spec.h * T;
    this.map = level.map;
    this.open = this.done;
    if (!this.done) this.setSolid(true);
    this.frames = Dissolve.frames(this.w, this.h);
  }
  setSolid(on) {
    for (let j = 0; j < this.th; j++) for (let i = 0; i < this.tw; i++) this.map.setFlag(this.tx + i, this.ty + j, on ? SOLID : 0);
  }
  // the wall art, and 16 progressively dithered copies of it
  static frames(w, h) {
    const key = w + 'x' + h;
    Dissolve.cache = Dissolve.cache || {};
    if (Dissolve.cache[key]) return Dissolve.cache[key];
    const [src, s] = makeCanvas(w, h);
    const half = w / 2;
    [[0, 0], [half, 1]].forEach(([x0, scene]) => {
      s.fillStyle = C('cyan.1'); s.fillRect(x0, 0, half, h);
      s.fillStyle = C('cyan.2'); s.fillRect(x0, 0, 2, h);
      for (let y = 4; y + 12 <= h; y += 14) {
        s.fillStyle = C('ink.0'); s.fillRect(x0 + 3, y - 1, half - 6, 12);
        scenePic(s, x0 + 4, y, half - 8, 10, scene);
      }
    });
    s.fillStyle = C('ink.0'); s.fillRect(half - 1, 0, 2, h); s.fillRect(0, 0, 1, h); s.fillRect(w - 1, 0, 1, h);
    const out = [];
    for (let f = 0; f < 16; f++) {
      const [c, cx] = makeCanvas(w, h);
      cx.drawImage(src, 0, 0);
      cx.fillStyle = '#000';
      cx.globalCompositeOperation = 'destination-out';
      for (let j = 0; j < h; j += 2) for (let i = 0; i < w; i += 2) if (bayer(i >> 1, j >> 1) < f / 16) cx.fillRect(i, j, 2, 2);
      out.push(c);
    }
    return (Dissolve.cache[key] = out);
  }
  update(level) {
    this.tick(level);
    if (this.done) return;
    if (this.job >= 46 && !this.open) { this.open = true; this.setSolid(false); }
    if (this.job >= 76) this.finish(level, 'Cross dissolve');
  }
  draw(ctx, cam, t) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const k = this.done ? 1 : this.job < 12 ? 0 : clamp((this.job - 12) / 60, 0, 1);
    if (k < 1) ctx.drawImage(this.frames[Math.min(15, Math.floor(k * 16))], x, y);
    // the label on the cut: hard cut, then the transition that replaced it
    const mid = x + this.w / 2;
    if (k < 0.5) label(ctx, 'Hard cut', mid, y + this.h - 30, '#e3e6ee', 6.5);
    else {
      bowtie(ctx, mid, y + this.h - 8);
      label(ctx, 'Cross dissolve', mid, y + this.h - 26, '#e3e6ee', 6.5);
    }
    const ay = this.drawSelf(ctx, cam, t);
    if (!this.done && this.job >= 0) beam(ctx, this.ax - cam.x, ay - cam.y + 4, mid, y + this.h / 2, 'white.2', t);
  }
}

// the cross-dissolve marker from a timeline: two facing triangles
function bowtie(ctx, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 9, y - 4, 18, 9);
  ctx.fillStyle = C('slate.2'); ctx.fillRect(x - 8, y - 3, 16, 7);
  ctx.fillStyle = C('white.1');
  for (let i = 0; i < 4; i++) { ctx.fillRect(x - 7 + i, y - 3 + i, 1, 7 - i * 2); ctx.fillRect(x + 6 - i, y - 3 + i, 1, 7 - i * 2); }
}

// On-screen text: a caption typed letter by letter; the text clip is the bridge
class Caption extends Agent {
  constructor(tx, ty, spec, level, key) {
    super(tx, ty, spec, level, key, 'text');
    this.x0 = tx * T; this.y0 = ty * T; this.w = spec.w * T;
    this.text = spec.text;
    this.n = this.done ? this.text.length : 0;
    this.plat = platform(this.x0, this.y0, this.done ? this.w : 0, 6, this.done);
    level.platforms.push(this.plat);
  }
  size() { return 10 * (this.w - 10) / textWidth(this.text, 10); }
  barW(n) { return n >= this.text.length ? this.w : Math.min(this.w, 10 + textWidth(this.text.slice(0, n), this.size())); }
  update(level) {
    this.tick(level);
    if (this.done || this.job < 18) return;
    const n = Math.min(this.text.length, Math.floor((this.job - 18) / 5) + 1);
    if (n !== this.n) { this.n = n; level.sfx('tick'); }
    this.plat.w = Math.round(this.barW(this.n));
    this.plat.active = true;
    if (this.n >= this.text.length) { this.plat.w = this.w; this.finish(level, 'Text added'); }
  }
  draw(ctx, cam, t) {
    const x = this.x0 - cam.x, y = this.y0 - cam.y;
    if (this.n > 0) {
      const w = this.barW(this.n);
      drawClip(ctx, x + 1, y, w - 2, 15, 'text');
      const typed = this.text.slice(0, this.n);
      const tw = drawText(ctx, typed, x + 5, y + 2, '#2a1a05', { size: this.size(), weight: 700 });
      if (this.n < this.text.length && (t >> 3) & 1) { ctx.fillStyle = C('gold.0'); ctx.fillRect(x + 6 + tw, y + 3, 1, 10); }
    }
    const ay = this.drawSelf(ctx, cam, t);
    if (!this.done && this.job >= 0) beam(ctx, this.ax - cam.x, ay - cam.y + 4, x + this.barW(this.n) - 2, y, 'gold.3', t);
  }
}

// what Shrey did on each part, in the bullet's own words: he built the
// front end and the agent layer, and contributed to the rest
function roleTag(ctx, role, cx, y) {
  const built = role === 'built', text = built ? 'Built' : 'Contributed';
  const w = Math.ceil(textWidth(text, 6)) + 8, x = Math.round(cx - w / 2);
  pill(ctx, x, y, w, 10, built ? '#3a2a0a' : '#0c1f2a', built ? '#f2b233' : '#156f73', 3);
  drawText(ctx, text, cx, y + 1, built ? '#ffe08a' : '#6fd6c8', { align: 'center', size: 6 });
}

// ─── p-vincio-3: Backstage, the stack behind the editor ─────────────
// Coordinates in spec are absolute room tiles. Before the fact the stack
// is idle; after it, every layer powers on, packets flow between them, and
// each part shows whether Shrey built it or contributed to it.

class Backstage {
  constructor(tx, ty, spec, level, key) {
    this.spec = spec; this.fact = spec.fact; this.key = key;
    this.level = level; this.map = level.map;
    this.cyl = spec.db.map(([cx, top, h]) => ({ x: cx * T, y: top * T, w: 2 * T, h: h * T }));
    for (const [cx, top, h] of spec.db) for (let j = 0; j < h; j++) for (let i = 0; i < 2; i++) level.map.setFlag(cx + i, top + j, SOLID);
    const [dx, dy, dh] = spec.auth;
    this.door = { tx: dx, ty: dy, th: dh, x: dx * T, y: dy * T, h: dh * T, k: 0 };
    this.openDoor = level.state.built.has(key + ':auth');
    if (this.openDoor) this.door.k = 1;
    else for (let j = 0; j < dh; j++) level.map.setFlag(dx, dy + j, SOLID);
    this.t = 0;
  }
  powered() { return this.level.game.progress.hasFact(this.fact); }
  onFact(id, level) { if (id === this.fact) { this.t = 0; level.sfx('build'); } }
  update(level) {
    this.t++;
    const d = this.door, h = level.hero;
    if (!this.openDoor && this.powered() && Math.abs(h.x + h.w / 2 - (d.x + 8)) < 44) {
      this.openDoor = true;
      level.state.built.add(this.key + ':auth');
      for (let j = 0; j < d.th; j++) this.map.setFlag(d.tx, d.ty + j, 0);
      level.sfx('build');
      level.floaters.push(new Floater(d.x + 8, d.y + d.h - 6, 'Signed in', '#90eaa8', 70));
    }
    if (this.openDoor) d.k = Math.min(1, d.k + 1 / 30);
  }
  pt(p) { return { x: p[0] * T, y: p[1] * T }; }
  back(ctx, cam, t) {
    const on = this.powered(), s = this.spec;
    // links between the layers; packets run along them once powered
    for (const path of s.links) {
      const pts = path.map((p) => this.pt(p));
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.fillStyle = C(on ? 'teal.1' : '#1c2140');
        if (a.x === b.x) ctx.fillRect(a.x - cam.x, Math.min(a.y, b.y) - cam.y, 1, Math.abs(b.y - a.y) + 1);
        else ctx.fillRect(Math.min(a.x, b.x) - cam.x, a.y - cam.y, Math.abs(b.x - a.x) + 1, 1);
      }
      if (on) {
        const L = pts.slice(1).reduce((n, p, i) => n + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0);
        for (let q = 0; q < 3; q++) {
          let d = ((t * 0.9 + q * L / 3) % L);
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i], seg = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
            if (d <= seg) {
              const k = seg ? d / seg : 0;
              ctx.fillStyle = C('teal.3');
              ctx.fillRect(Math.round(lerp(a.x, b.x, k) - cam.x) - 1, Math.round(lerp(a.y, b.y, k) - cam.y) - 1, 3, 3);
              break;
            }
            d -= seg;
          }
        }
      }
    }
    // agent memory: three chips that light once the layer is running
    const [mx, my] = s.memory, mX = mx * T - cam.x, mY = my * T - cam.y;
    pill(ctx, mX, mY, 64, 44, '#0c1029', '#2c3566', 3);
    drawText(ctx, 'Agent memory', mX + 32, mY + 1, '#6fd6c8', { align: 'center', size: 6.5 });
    for (let i = 0; i < 3; i++) {
      const cx = mX + 8 + i * 18, cy = mY + 15;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(cx - 1, cy - 1, 14, 12);
      const lit = on && ((t >> 4) + i) % 4 !== 0;
      ctx.fillStyle = C(lit ? 'teal.2' : 'slate.1'); ctx.fillRect(cx, cy, 12, 10);
      ctx.fillStyle = C(lit ? 'teal.3' : 'slate.2'); ctx.fillRect(cx + 2, cy + 2, 8, 2); ctx.fillRect(cx + 2, cy + 6, 5, 2);
      for (let p = 0; p < 3; p++) { ctx.fillStyle = C('slate.3'); ctx.fillRect(cx + 2 + p * 4, cy + 10, 2, 2); }
    }
    if (on) roleTag(ctx, s.memoryRole, mX + 32, mY + 31);
    // the front end: the editor itself, in a browser window
    const [fx, fy, fw, fh] = s.front, x = fx * T - cam.x, y = fy * T - cam.y, w = fw * T, h = fh * T;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = C('#0f1430'); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C('indigo.2'); ctx.fillRect(x, y, w, 9);
    [['red.2', 0], ['gold.2', 5], ['green.2', 10]].forEach(([c, dx]) => { ctx.fillStyle = C(c); ctx.fillRect(x + 4 + dx, y + 3, 3, 3); });
    drawText(ctx, 'Vincio', x + 22, y + 1, '#e3e6ee', { size: 6.5 });
    if (on) {
      const ph = h - 30;                                     // preview height; lanes below it
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 5, y + 12, w - 10, ph + 2);
      scenePic(ctx, x + 6, y + 13, w - 12, ph, 1);
      ['video', 'audio', 'text'].forEach((kind, i) => {
        const ly = y + h - 15 + i * 5, len = [0.8, 0.65, 0.4][i];
        ctx.fillStyle = C(CLIP[kind][1]); ctx.fillRect(x + 6, ly, Math.round((w - 12) * len), 4);
        ctx.fillStyle = C(CLIP[kind][2]); ctx.fillRect(x + 6, ly, Math.round((w - 12) * len), 1);
      });
      const hx = x + 6 + ((t >> 1) % (w - 12));
      ctx.fillStyle = C('red.2'); ctx.fillRect(hx, y + h - 17, 1, 16);
    } else {
      drawText(ctx, 'Offline', x + w / 2, y + h / 2 - 6, '#4a5068', { align: 'center', size: 7 });
    }
    // zone labels, with the role tag below or to the right once powered
    for (const [text, lx, ly, role, place] of s.labels) {
      const cx = lx * T - cam.x, cy = ly * T - cam.y;
      label(ctx, text, cx, cy, on ? '#e3e6ee' : '#8a95b4', 7);
      if (!on || !role) continue;
      if (place === 'right') roleTag(ctx, role, cx + textWidth(text, 7) / 2 + 16, cy);
      else roleTag(ctx, role, cx, cy + 10);
    }
  }
  draw(ctx, cam, t) {
    const on = this.powered();
    // database: stacked disk cylinders you can stand on
    for (const c of this.cyl) {
      const x = c.x - cam.x, y = c.y - cam.y;
      ctx.fillStyle = C('ink.0'); ctx.fillRect(x, y + 1, c.w, c.h - 1); ctx.fillRect(x + 2, y, c.w - 4, c.h);
      ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 1, y + 2, c.w - 2, c.h - 3);
      ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 3, y + 2, 6, c.h - 3);
      for (let ry = y + 12; ry < y + c.h - 4; ry += 10) {
        ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 1, ry, c.w - 2, 2);
        const lit = on && ((t >> 3) + ry) % 5 < 3;
        ctx.fillStyle = C(lit ? 'green.3' : 'slate.1'); ctx.fillRect(x + c.w - 7, ry - 4, 2, 2);
      }
      // the top: an ellipse lid
      ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 3, y + 1, c.w - 6, 4); ctx.fillRect(x + 1, y + 2, c.w - 2, 2);
      ctx.fillStyle = C('white.0'); ctx.fillRect(x + 5, y + 1, c.w - 10, 1);
      ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 4, y + 5, c.w - 8, 1);
    }
    // the agent layer: the four agents, asleep until powered
    this.spec.crew.forEach(([cx, cy, kind], i) => drawAgent(ctx, cx * T - cam.x, cy * T - cam.y, t, kind, on, i * 2));
    // auth: a door that slides up once the stack is live
    const d = this.door, x = d.x - cam.x, y = d.y - cam.y - Math.round(ease.inOutCubic(d.k) * (d.h - 4));
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 2, d.y - cam.y, T + 4, d.h); ctx.clip();
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x, y, T, d.h);
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 1, y, T - 2, d.h - 1);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 2, y, 3, d.h - 1);
    for (let ry = 8; ry < d.h - 4; ry += 12) { ctx.fillStyle = C('steel.1'); ctx.fillRect(x + 1, y + ry, T - 2, 1); }
    // the lock panel
    const ly = y + d.h - 30;
    ctx.fillStyle = C('ink.0'); ctx.fillRect(x + 3, ly, 10, 12);
    const ok = this.openDoor;
    ctx.fillStyle = C(ok ? 'green.2' : on ? 'gold.2' : 'red.2');
    ctx.fillRect(x + 5, ly + 5, 6, 5);
    ctx.fillRect(x + 6, ly + 2, 1, 3); ctx.fillRect(x + 9, ly + (ok ? 1 : 2), 1, ok ? 2 : 3); ctx.fillRect(x + 6, ly + 2, 4, 1);
    ctx.restore();
    label(ctx, 'Auth', d.x + 8 - cam.x, d.y + d.h - 46 - cam.y, ok ? '#90eaa8' : on ? '#ffe08a' : '#ff8f7f', 7);
    if (on) roleTag(ctx, this.spec.authRole, d.x + 8 - cam.x, d.y + d.h - 36 - cam.y);
  }
}

// ─── the goal: export the cut ────────────────────────────────────────

class Render {
  constructor(tx, ty, spec, level) { this.x = tx * T + 8; this.y = ty * T; this.file = spec.file; this.k = 0; }
  update(level) {
    if (!this.goal) this.goal = level.objects.find((o) => o instanceof Goal);
    if (this.goal && this.goal.pressed) this.k = Math.min(1, this.k + 1 / 90);
  }
  back(ctx, cam, t) {
    const w = 104, x = Math.round(this.x - w / 2 - cam.x), y = this.y - cam.y;
    pill(ctx, x, y, w, 22, 'rgba(16,20,42,0.92)', '#2c3566', 3);
    const done = this.k >= 1;
    drawText(ctx, done ? this.file + ' ✓' : this.k > 0 ? 'Exporting…' : this.file, x + w / 2, y + 2, done ? '#90eaa8' : '#e3e6ee', { align: 'center', size: 6.5 });
    ctx.fillStyle = C('slate.0'); ctx.fillRect(x + 6, y + 14, w - 12, 4);
    if (this.k > 0) {
      ctx.fillStyle = C(done ? 'green.2' : 'cyan.2'); ctx.fillRect(x + 6, y + 14, Math.round((w - 12) * this.k), 4);
      ctx.fillStyle = C('white.2'); ctx.fillRect(x + 6, y + 14, Math.round((w - 12) * this.k), 1);
    }
  }
}

registerSetpiece('vincio.label', Label);
registerSetpiece('vincio.cut', Cut);
registerSetpiece('vincio.broll', BRoll);
registerSetpiece('vincio.motion', Motion);
registerSetpiece('vincio.dissolve', Dissolve);
registerSetpiece('vincio.caption', Caption);
registerSetpiece('vincio.backstage', Backstage);
registerSetpiece('vincio.render', Render);

// ─── music: a laid-back edit-suite loop in D minor ──────────────────

registerSong('studio', {
  bpm: 112,
  lead: steps('D5 . F5 A5 . G5 F5 . | E5 . C5 . D5 . A4 . | D5 . F5 A5 . C6 A5 . | G5 . E5 . F5 . D5 . | ' +
    'A5 . G5 F5 . E5 D5 . | C5 . E5 . G5 . E5 . | F5 . E5 D5 . C5 A4 . | D5 . . . A4 . D5 .'),
  bass: steps('D3 . . D3 A2 . . . | C3 . . C3 G2 . . . | A#2 . . A#2 F2 . . . | A2 . . A2 E2 . A2 . | ' +
    'F2 . . F2 C3 . . . | C3 . . C3 G2 . . . | A#2 . . A#2 F2 . . . | A2 . E2 . D3 . . .'),
  drums: steps('k . h . s . h h | k . h k s . h . | k . h . s . h h | k k h . s . s h'),
});

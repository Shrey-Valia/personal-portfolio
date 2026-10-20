// DROID STRIKE BACK · San Francisco hackathon, Nov 2025 (1st place, Omi
// category). Shrey built a voice-controlled robot: spoken commands picked
// up by Omi, an AI wearable, became instructions for a digital robot
// navigating a burning building. Here the hero is the voice:
//   voice pads     stand on one and Omi hears the command ("Forward",
//                  "Extinguish"); the robot shows the instruction it got
//                  and carries it out. Its own deck is the "Lift" pad.
//   rescue robot   boxy, on treads, one round eye. FORWARD drives it into
//                  a collapsed floor as a bridge; EXTINGUISH foams a wall
//                  of fire away; LIFT raises its scissor deck to the next
//                  floor. It runs on rails, never dies, and rewinds with
//                  checkpoints.
//   hazards        floor vents that glow and smoke for 2/3 s before they
//                  flare, a fire wall, burnt planks that crack before they
//                  drop. Ember hoppers (j) and smoke puffs (y).

import { TILE, H } from '../config.js';
import { col } from '../art/palette.js';
import { registerKit, hline, vline, px } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { stripedSky, disc, pill, line, noise1 } from '../art/draw.js';
import { drawText, textWidth, lineHeight } from '../art/font.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { registerEnemy, Enemy } from '../game/enemies.js';
import { Floater } from '../game/objects.js';
import { registerSong, steps } from '../engine/audio.js';
import { moveBody } from '../engine/physics.js';
import { SOLID } from '../engine/tilemap.js';
import { clamp, lerp, ease, rng, hash2, makeCanvas, overlaps } from '../engine/util.js';

const C = (r) => col(r);
const INK = '#0b0d17';

function floorBelow(map, tx, ty) {
  let y = ty;
  while (y < map.rows && !(map.flag(tx, y) & SOLID)) y++;
  return y * TILE;
}
function ceilingAbove(map, tx, ty) {
  let y = ty;
  while (y >= 0 && !(map.flag(tx, y) & SOLID)) y--;
  return (y + 1) * TILE;
}
const onScreen = (x, w, cam, ctx) => x - cam.x < ctx.W + 8 && x + w - cam.x > -8;

// ─── flames: one column of tongues, palette-cycled ───────────────────

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
      ctx.fillStyle = C(FLAME[b + (b > 1 && ((t >> 2) + i) % 5 === 0 ? 1 : 0)]);
      ctx.fillRect(x + i, base - bh, 1, bh);
    }
  }
}

// ─── terrain: brick walls, burnt floorboards, a steel fire escape ────

function fireKit() {
  const K = {
    mortar: C('#2a1512'), b1: C('#5a2d25'), b2: C('#4c2620'), b3: C('#63342a'), lit: C('#e0a066'),
    board: C('wood.2'), board2: C('wood.1'), seam: C('wood.0'), soot: C('#1d0f0d'), edgeHi: C('#7a3e30'),
    ember: C('orange.2'), ink: C('ink.0'),
  };
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.fillStyle = K.mortar; ctx.fillRect(x, y, 16, 16);
      for (let r = 0; r < 4; r++) {
        const off = ((ty * 4 + r) & 1) ? 4 : 0;
        for (let c = -1; c < 2; c++) {
          const bx = c * 8 + off, h = hash2(tx * 3 + c, ty * 4 + r);
          ctx.fillStyle = h < 0.33 ? K.b1 : h < 0.66 ? K.b2 : K.b3;
          const x0 = Math.max(0, bx), x1 = Math.min(16, bx + 7);
          if (x1 > x0) ctx.fillRect(x + x0, y + r * 4, x1 - x0, 3);
        }
      }
      if (hash2(tx, ty) < 0.07) { ctx.fillStyle = K.ember; ctx.fillRect(x + 5 + Math.floor(hash2(ty, tx) * 6), y + 9, 2, 1); }
      if (!(m & 1)) {
        // burnt floorboards, lit from below by the fire
        hline(ctx, x, y, 16, K.lit);
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = ((tx * 16 + i) >> 3) & 1 ? K.board : K.board2;
          ctx.fillRect(x + i, y + 1, 1, 4);
        }
        vline(ctx, x + ((tx * 5) & 7), y + 1, 4, K.seam); vline(ctx, x + 8 + ((tx * 5) & 7) % 8, y + 1, 4, K.seam);
        hline(ctx, x, y + 5, 16, K.seam);
        ctx.fillStyle = K.soot; ctx.fillRect(x, y + 6, 16, 2);
      }
      if (!(m & 4)) { ctx.fillStyle = K.soot; ctx.fillRect(x, y + 13, 16, 2); hline(ctx, x, y + 15, 16, K.ink); }
      if (!(m & 8)) vline(ctx, x, y, 16, K.edgeHi);
      if (!(m & 2)) vline(ctx, x + 15, y, 16, K.ink);
    },
    oneway(ctx, x, y, joinL, joinR) {
      // fire escape grating
      hline(ctx, x, y, 16, C('steel.4'));
      ctx.fillStyle = C('steel.2'); ctx.fillRect(x, y + 1, 16, 3);
      for (let i = 1; i < 16; i += 3) px(ctx, x + i, y + 2, C('steel.0'));
      hline(ctx, x, y + 4, 16, K.ink);
      // the railing
      ctx.fillStyle = C('steel.3'); ctx.fillRect(x, y - 10, 16, 1);
      if (!joinL) { vline(ctx, x, y - 10, 15, K.ink); vline(ctx, x + 1, y - 10, 10, C('steel.3')); }
      if (!joinR) { vline(ctx, x + 15, y - 10, 15, K.ink); vline(ctx, x + 14, y - 10, 10, C('steel.3')); }
      vline(ctx, x + 8, y - 10, 10, C('steel.2'));
    },
    animated() {},
  };
}
registerKit('droidFire', fireKit());

// ─── backdrop: San Francisco at night, fog, the glow of the fire ─────

function nightCity(W) {
  const sky = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#060818', '#0d1230', '#1a1840', '#30204a', '#542440', '#86343a', '#b04a34']);
    const r = rng(77);
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * 90);
      ctx.fillStyle = r() < 0.2 ? '#ffffff' : '#9aa6cc'; ctx.fillRect(x, y, 1, 1);
    }
  });
  // hills and a far skyline of towers
  const far = strip(768, (ctx, w) => {
    const n = noise1(4);
    ctx.fillStyle = C('#171836');
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const v = n(t * w * 0.012) * (1 - t) + n((t - 1) * w * 0.012 + 256) * t;
      const y = Math.round(150 - v * 26);
      ctx.fillRect(x, y, 1, H - y);
    }
    const r = rng(12);
    let x = 10;
    while (x < w - 40) {
      const bw = 12 + Math.floor(r() * 20), bh = 30 + Math.floor(r() * 46), top = 150 - bh;
      ctx.fillStyle = C('#13142e'); ctx.fillRect(x, top, bw, H - top);
      if (r() < 0.3) { ctx.fillRect(x + Math.floor(bw / 2), top - 10, 1, 10); ctx.fillStyle = C('red.2'); ctx.fillRect(x + Math.floor(bw / 2), top - 11, 1, 1); }
      for (let wy = top + 4; wy < 146; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        if (r() < 0.16) { ctx.fillStyle = r() < 0.7 ? '#ffd27a' : '#9fd0ff'; ctx.fillRect(wx, wy, 1, 1); }
      }
      x += bw + 4 + Math.floor(r() * 26);
    }
  });
  const near = strip(640, (ctx, w) => {
    const r = rng(19);
    let x = 0;
    while (x < w) {
      const bw = 26 + Math.floor(r() * 30), bh = 22 + Math.floor(r() * 40), top = 176 - bh;
      ctx.fillStyle = C('#0b0b1c'); ctx.fillRect(x, top, bw, H - top);
      ctx.fillStyle = C('#1a1934'); ctx.fillRect(x, top, bw, 1);
      if (r() < 0.35) { ctx.fillStyle = C('#0b0b1c'); ctx.fillRect(x + 4, top - 8, 8, 8); ctx.fillRect(x + 5, top - 12, 1, 4); ctx.fillRect(x + 10, top - 12, 1, 4); }
      for (let wy = top + 5; wy < 172; wy += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (r() < 0.25) { ctx.fillStyle = r() < 0.8 ? '#e8b964' : '#7fb2e6'; ctx.fillRect(wx, wy, 2, 2); }
      }
      x += bw + 3 + Math.floor(r() * 8);
    }
  });
  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, far, camX, 0.08 * k, -camY * 0.1);
      // fog drifting across the bay
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const y = 118 + i * 16;
        const drift = reduced ? 0 : (t * (0.15 + i * 0.05) + i * 90) % (ctx.W + 200);
        ctx.fillStyle = `rgba(190,196,226,${0.06 + i * 0.015})`;
        for (let s = -200; s < ctx.W + 200; s += 140) ctx.fillRect(Math.round(s + drift - 200), y + Math.round(Math.sin((s + i * 50) / 70) * 3), 110, 9 + i * 2);
      }
      ctx.restore();
      blitStrip(ctx, near, camX, 0.25 * k, -camY * 0.2);
    },
  };
}
registerBackground('droidFire', nightCity);

// ─── the building: back wall, windows, strobes, smoke; the street ────

class Scene {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x0 = spec.building[0] * TILE; this.x1 = spec.building[1] * TILE;
    this.cx0 = spec.collapse[0] * TILE; this.cx1 = spec.collapse[1] * TILE;
    this.streets = spec.street.map(([a, b]) => [a * TILE, b * TILE]);
    this.exit = spec.exit ? { x: spec.exit[0] * TILE, y: spec.exit[1] * TILE } : null;
    this.holes = (spec.holes || []).map(([a, b]) => [a * TILE, b * TILE]);
    this.wall = this.paint(level.map.h);
    this.lamps = [];
    for (let x = this.x0 + 72; x < this.x1 - 24; x += 208) this.lamps.push([x, 30], [x + 104, 118]);
    const r = rng(5);
    this.puffs = Array.from({ length: 16 }, (_, i) => ({ s: r() * (this.x1 - this.x0), band: i & 1 ? 116 : 30, r: 6 + Math.floor(r() * 6), v: 0.15 + r() * 0.2 }));
    this.fires = [];
    for (let x = this.cx0 + 20; x < this.cx1 - 10; x += 26 + Math.floor(r() * 20)) this.fires.push([x, 12 + Math.floor(r() * 10), r() * 9]);
  }

  paint(h) {
    const w = this.x1 - this.x0;
    const [c, ctx] = makeCanvas(w, h);
    const n = noise1(9);
    stripedSky(ctx, w, h, ['#1d1218', '#2c1c22', '#33202a', '#2e1c24']);
    // wallpaper stripes, faint
    for (let x = 0; x < w; x += 6) { ctx.fillStyle = 'rgba(255,220,200,0.035)'; ctx.fillRect(x, 0, 2, h); }
    // a burnt-out roofline: the night shows through the holes
    for (let x = 0; x < w; x++) {
      const top = Math.round(16 + n(x * 0.05) * 14 + (Math.sin(x / 7) > 0.92 ? 6 : 0));
      ctx.clearRect(x, 0, 1, top);
      ctx.fillStyle = C('#140c10'); ctx.fillRect(x, top, 1, 2);
    }
    // windows on both floors, glass cracked, the city behind
    const r = rng(31);
    for (let wx = 40; wx < w - 40; wx += 144) {
      for (const [wy, wh] of [[34, 34], [122, 30]]) {
        if (wy > 96 && wx + this.x0 > this.cx0) continue;
        ctx.fillStyle = C('#140c10'); ctx.fillRect(wx - 3, wy - 3, 46, wh + 6);
        ctx.fillStyle = C('#141a3a'); ctx.fillRect(wx, wy, 40, wh);
        for (let i = 0; i < 14; i++) { ctx.fillStyle = r() < 0.7 ? '#e8b964' : '#7fb2e6'; ctx.fillRect(wx + 2 + Math.floor(r() * 36), wy + 6 + Math.floor(r() * (wh - 8)), 1, 1); }
        ctx.fillStyle = C('#140c10'); ctx.fillRect(wx + 19, wy, 2, wh); ctx.fillRect(wx, wy + wh / 2 - 1, 40, 2);
        line(ctx, wx + 4, wy + 2, wx + 14, wy + 12, '#5a6a9a');
      }
    }
    // the collapsed half: no floor below the upper storey, just fire light
    const cx = this.cx0 - this.x0, cw = this.cx1 - this.cx0;
    for (let y = 96; y < h; y++) {
      const k = (y - 96) / (h - 96);
      ctx.fillStyle = `rgba(${Math.round(60 + 160 * k)},${Math.round(20 + 50 * k)},${Math.round(20 + 10 * k)},${(0.35 + 0.6 * k).toFixed(2)})`;
      ctx.fillRect(cx, y, cw, 1);
    }
    // charred joists sticking out where the floor used to be
    for (let jx = cx + 30; jx < cx + cw - 30; jx += 90) {
      ctx.fillStyle = C('#140c10'); ctx.fillRect(jx, 120, 26, 4); ctx.fillRect(jx + 40, 166, 18, 3);
    }
    return c;
  }

  back(ctx, cam, t) {
    const L = this.level;
    const x = this.x0 - cam.x;
    if (x < ctx.W && x + this.wall.width > 0) ctx.drawImage(this.wall, x, -cam.y);
    const reduced = L.game.reduced;
    // fire light flickering up out of the collapse
    const fx = this.cx0 - cam.x;
    if (fx < ctx.W && fx + (this.cx1 - this.cx0) > 0) {
      ctx.fillStyle = `rgba(255,120,40,${(0.07 + (reduced ? 0 : 0.04 * Math.sin(t / 6))).toFixed(3)})`;
      ctx.fillRect(fx, 100 - cam.y, this.cx1 - this.cx0, 124);
      for (const [px0, h, s] of this.fires) {
        const sx = px0 - cam.x;
        if (sx < -20 || sx > ctx.W + 20) continue;
        flames(ctx, sx, L.map.h - cam.y, 14, h + 8, reduced ? 0 : t, s);
      }
    }
    // fire down in the holes in the floor
    for (const [a, b] of this.holes) {
      const sx = a - cam.x, w = b - a;
      if (sx > ctx.W || sx + w < 0) continue;
      for (let y = 176; y < L.map.h; y += 2) {
        const k = (y - 176) / (L.map.h - 176);
        ctx.fillStyle = `rgba(255,${Math.round(90 + 40 * k)},40,${(0.15 + 0.45 * k).toFixed(2)})`;
        ctx.fillRect(sx, y - cam.y, w, 2);
      }
      flames(ctx, sx + 4, L.map.h - cam.y, w - 8, 14, reduced ? 0 : t, a);
    }
    // smoke rolling along the ceilings
    if (!reduced) {
      const w = this.x1 - this.x0;
      for (const p of this.puffs) {
        const sx = this.x0 + ((p.s + t * p.v) % w) - cam.x;
        if (sx < -20 || sx > ctx.W + 20) continue;
        ctx.fillStyle = 'rgba(30,24,32,0.45)';
        ctx.beginPath(); ctx.arc(sx, p.band - cam.y + Math.sin(t / 40 + p.s) * 2, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // emergency strobes: a red lamp, a pulse of light every 1.5 s
    for (const [lx, ly] of this.lamps) {
      const sx = lx - cam.x, sy = ly - cam.y;
      if (sx < -30 || sx > ctx.W + 30) continue;
      const on = reduced ? 0.5 : Math.max(0, Math.sin((t % 90) / 90 * Math.PI * 2)) ** 3;
      if (on > 0.05) { ctx.fillStyle = `rgba(255,50,50,${(0.22 * on).toFixed(3)})`; ctx.beginPath(); ctx.arc(sx, sy + 2, 22, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = INK; ctx.fillRect(sx - 4, sy - 1, 8, 5);
      ctx.fillStyle = on > 0.3 ? C('red.3') : C('red.1'); ctx.fillRect(sx - 3, sy, 6, 3);
    }
    // the exit sign by the window
    if (this.exit) {
      const ex = this.exit.x - cam.x, ey = this.exit.y - cam.y;
      const w = Math.ceil(textWidth('Exit ▶', 7, 700)) + 10;
      pill(ctx, ex - w / 2, ey, w, lineHeight(7) + 3, '#1d6b43', INK, 2);
      drawText(ctx, 'Exit ▶', ex, ey + 1, '#e9fbe9', { align: 'center', size: 7, weight: 700 });
    }
  }

  // sidewalks and asphalt over the street ground, in front of the tiles
  draw(ctx, cam) {
    for (const [a, b] of this.streets) {
      const x = a - cam.x, w = b - a;
      if (x > ctx.W || x + w < 0) continue;
      const y = 176 - cam.y;
      ctx.fillStyle = C('#9aa0ab'); ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = C('#767c88'); ctx.fillRect(x, y + 2, w, 6);
      for (let sx = a - (a % 32); sx < b; sx += 32) if (sx >= a) { ctx.fillStyle = C('#5d626d'); ctx.fillRect(sx - cam.x, y + 2, 1, 6); }
      ctx.fillStyle = C('#3a3d46'); ctx.fillRect(x, y + 8, w, 2);
      ctx.fillStyle = C('#22252d'); ctx.fillRect(x, y + 10, w, 48);
      for (let sx = a - (a % 40) + 8; sx < b - 8; sx += 40) if (sx >= a) { ctx.fillStyle = C('gold.2'); ctx.fillRect(sx - cam.x, y + 28, 18, 2); }
    }
  }
}

// ─── voice: the hero's speech bubble with a live waveform ───────────

function voiceBubble(ctx, cx, bottom, word, t) {
  // what Omi heard: a small "Omi" label, a live waveform, the command
  const text = '“' + word + '”';
  const tw = Math.ceil(textWidth(text, 8, 700)), ow = Math.ceil(textWidth('Omi', 6, 700));
  const w = tw + ow + 40, h = lineHeight(8) + 8;
  const x = Math.round(Math.max(4, Math.min(ctx.W - w - 4, cx - w / 2))), y = Math.round(bottom - h - 6);
  pill(ctx, x, y, w, h, '#fbf8f1', INK, 4);
  ctx.beginPath(); ctx.moveTo(cx - 3, y + h - 0.5); ctx.lineTo(cx, y + h + 5); ctx.lineTo(cx + 3, y + h - 0.5); ctx.fillStyle = '#fbf8f1'; ctx.fill();
  pill(ctx, x + 4, y + 4, ow + 6, h - 8, '#0e3b43', null, 2);
  drawText(ctx, 'Omi', x + 7, y + Math.round(h / 2) - 4, '#6fd6c8', { size: 6, weight: 700 });
  const wx = x + ow + 14;
  for (let i = 0; i < 6; i++) {
    const a = Math.abs(Math.sin(t / 3 + i * 1.3)) * 0.8 + 0.2;
    const bh = Math.max(2, Math.round(a * (h - 8)));
    ctx.fillStyle = C(i % 2 ? 'cyan.2' : 'teal.2');
    ctx.fillRect(wx + i * 3, y + Math.round(h / 2 - bh / 2), 2, bh);
  }
  drawText(ctx, text, wx + 21, y + 4, '#1b1e2b', { size: 8, weight: 700 });
  return { x, y, w, h };
}

function tagPill(ctx, cx, y, text, bg, fg) {
  const w = Math.ceil(textWidth(text, 6.5, 700)) + 10, h = lineHeight(6.5) + 3;
  const x = Math.round(cx - w / 2);
  pill(ctx, x, y, w, h, bg, INK, 3);
  drawText(ctx, text, cx, y + 1, fg, { align: 'center', size: 6.5, weight: 700 });
  return { x, w, h };
}

// ─── the rescue robot ────────────────────────────────────────────────
// 48×28: treads and a base plate below, an orange box on top with one
// round eye, a status screen, a foam cannon and an antenna. The deck on
// top is a platform. A scissor lift raises the box; wings fold out to
// plug the shaft once it's up.

const RW = 48, RH = 28, SINK = 28;
const STEPS = ['Forward', 'Extinguish', 'Lift'];
const DOING = ['Moving forward', 'Spraying foam', 'Lifting'];

class Robot {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.floor = floorBelow(level.map, tx, ty);
    this.homeX = tx * TILE;
    this.gapX = spec.gap * TILE + 8;           // a 4-tile hole; the robot fits it with 8 px to spare each side
    this.sprayX = spec.spray * TILE;
    this.shaftX = spec.shaft * TILE;
    this.liftH = this.floor - RH - spec.liftTo * TILE;
    this.endX = spec.end * TILE;
    this.endFloor = floorBelow(level.map, spec.end, ty);
    this.handoff = [spec.handoff[0] * TILE, spec.handoff[1] * TILE];
    this.plat = platform(this.homeX, this.floor - RH, RW, 4);
    this.plat.robot = true;
    this.wingL = platform(this.shaftX - 16, 0, 16, 4, false);
    this.wingR = platform(this.shaftX + RW, 0, 16, 4, false);
    this.wingL.robot = this.wingR.robot = true;
    level.platforms.push(this.plat, this.wingL, this.wingR);
    this.cp = null; this.saved = 0;
    // respawn hook: the level resets every enemy on respawn
    level.enemies.push({ alive: true, x: -999, y: -999, w: 0, h: 0, stompable: () => false, update() {}, draw() {}, reset: () => this.restore(this.saved) });
    this.t = 0;
    this.restore(0);
  }

  get fires() { return this.level.setpieces.filter((s) => s instanceof FireWall); }

  restore(saved) {
    this.done = saved; this.want = saved;
    this.task = null; this.voice = null; this.onDeck = 0; this.escape = 0;
    this.sink = 0; this.lift = 0; this.wings = 0; this.where = 'house';
    this.x = [this.homeX, this.gapX, this.shaftX, this.shaftX][saved];
    this.parkX = this.x;
    if (saved === 1) this.sink = SINK;
    if (saved === 3) { this.lift = this.liftH; this.wings = 16; }
    for (const f of this.fires) f.setOut(saved >= 2);
    this.sync(true);
  }

  // the hero's voice, picked up by Omi
  hear(step) {
    if (this.task || this.voice || step < this.done || this.want > step) return;
    this.voice = { step, t: 0 };
    this.level.sfx('tick');
  }

  begin(step) {
    this.task = { step, phase: 0, t: 0 };
    this.level.sfx('build');
  }

  sync(snap) {
    const p = this.plat, floor = this.where === 'street' ? this.endFloor : this.floor;
    if (!snap) { p.prevX = p.x; p.prevY = p.y; }
    p.x = Math.round(this.x);
    p.y = Math.round(floor - RH + this.sink - this.lift);
    if (snap) { p.prevX = p.x; p.prevY = p.y; }
    for (const w of [this.wingL, this.wingR]) {
      w.prevX = w.x; w.prevY = w.y;
      w.y = p.y;
      w.active = this.where === 'house' && this.wings >= 16;
      if (snap) w.prevY = w.y;
    }
  }

  drive(target, speed = 1.6) {
    const d = target - this.x;
    if (Math.abs(d) <= speed) { this.x = target; return true; }
    this.x += Math.sign(d) * speed;
    this.tread = (this.tread || 0) + Math.sign(d);
    return false;
  }

  update(level) {
    this.t++;
    const hero = level.hero;
    if (level.checkpoint !== this.cp) {
      // a new checkpoint saves how far the rescue has got (a step in progress counts)
      this.cp = level.checkpoint;
      this.saved = this.done + (this.task ? 1 : 0);
    }
    const p = this.plat;
    p.prevX = p.x; p.prevY = p.y;

    // after the lift, meet the hero outside (both spots are off-screen when it switches)
    if (this.done >= 3) {
      if (this.where === 'house' && hero.x > this.handoff[1]) { this.where = 'street'; this.x = this.endX; this.lift = 0; this.wings = 0; }
      else if (this.where === 'street' && hero.x < this.handoff[0] && !this.escape) { this.where = 'house'; this.x = this.shaftX; this.lift = this.liftH; this.wings = 16; }
      if (this.where === 'street' && hero.state === 'victory') this.escape++;
      if (this.escape && this.x < level.map.w + 64) { this.x += Math.min(2.2, this.escape / 20); this.tread = (this.tread || 0) + 1; }
    }

    if (this.voice) {
      this.voice.t++;
      if (this.voice.t === 30) this.want = this.voice.step + 1;
      if (this.voice.t > 84) this.voice = null;
    }
    if (!this.task && this.done < this.want) this.begin(this.done);

    const T = this.task;
    if (T) {
      T.t++;
      if (T.step === 0) {
        if (T.phase === 0 && this.drive(this.gapX)) { T.phase = 1; T.t = 0; }
        else if (T.phase === 1) {
          this.sink = SINK * ease.inOutCubic(Math.min(1, T.t / 24));
          if (T.t % 4 === 0) level.game.particles.burst(this.x + RW / 2, this.floor, 3, [C('gold.3'), C('orange.2')], { speed: 1.4, up: 1, life: 12 });
          if (T.t >= 24) { this.sink = SINK; this.finish(this.gapX); level.camera.shake(0.2); }
        }
      } else if (T.step === 1) {
        if (T.phase === 0) {
          this.sink = SINK * (1 - ease.inOutCubic(Math.min(1, T.t / 20)));
          if (T.t >= 20) { this.sink = 0; T.phase = 1; T.t = 0; }
        } else if (T.phase === 1 && this.drive(this.sprayX)) { T.phase = 2; T.t = 0; }
        else if (T.phase === 2) {
          this.spray(level, T.t);
          if (T.t === 26) for (const f of this.fires) f.douse(level);
          if (T.t >= 96) this.finish(this.shaftX);
        }
      } else if (T.step === 2) {
        if (T.phase === 0) {
          this.lift = this.liftH * ease.inOutCubic(Math.min(1, T.t / 72));
          if (T.t >= 72) { this.lift = this.liftH; T.phase = 1; T.t = 0; level.sfx('bump'); }
        } else {
          this.wings = Math.min(16, T.t * 1.5);
          if (this.wings >= 16) this.finish(this.shaftX);
        }
      }
    } else if (this.where === 'house' && this.sink === 0 && this.lift === 0) {
      this.drive(this.parkX);
    }

    // the deck is the Lift pad once the robot waits under the shaft
    const parked = !this.task && this.done === 2 && Math.abs(this.x - this.shaftX) < 0.5;
    if (parked && hero.ground === p && hero.grounded) { if (++this.onDeck > 8) this.hear(2); } else this.onDeck = 0;
    this.sync(false);
  }

  finish(parkX) {
    this.done = this.task.step + 1;
    this.task = null;
    this.parkX = parkX;
    this.level.sfx('checkpoint');
  }

  spray(level, t) {
    // foam arcs from the cannon to the base of the fire
    const f = this.fires[0];
    if (!f || t > 80) return;
    const sx = this.x + RW + 4, sy = p0(this) + 13;
    for (let i = 0; i < 2; i++) {
      const tx = f.x + 4 + Math.random() * (f.w - 8), ty = f.y + f.h * (0.3 + Math.random() * 0.7);
      const T = 26, g = 0.12;
      const vx = (tx - sx) / T, vy = (ty - sy - 0.5 * g * T * T) / T;
      level.game.particles.one(sx, sy, vx, vy, C(i ? 'white.2' : 'cyan.3'), T, g, 2);
    }
  }

  draw(ctx, cam, t) {
    const L = this.level;
    // the voice bubble and the signal from Omi to the robot
    if (this.voice) {
      const h = L.hero, hx = h.x + h.w / 2 - cam.x, hy = h.y - cam.y;
      const b = voiceBubble(ctx, hx, hy - 2, STEPS[this.voice.step], t);
      const rx = this.x + 5 - cam.x, ry = p0(this) - 8 - cam.y;
      if (this.voice.t > 8 && this.voice.t < 40) {
        const n = 10;
        for (let i = 0; i < n; i++) {
          const k = i / n, k2 = ((this.voice.t - 8) / 32 + k) % 1;
          if (k2 > (this.voice.t - 8) / 32 + 0.05) continue;
          const qx = lerp(b.x + b.w / 2, rx, k2), qy = lerp(b.y, ry, k2) - Math.sin(k2 * Math.PI) * 18;
          ctx.fillStyle = C('cyan.3'); ctx.fillRect(Math.round(qx), Math.round(qy), 2, 2);
        }
      }
    }
    const x = Math.round(this.x - cam.x);
    if (x < -60 || x > ctx.W + 60) return;
    const floor = (this.where === 'street' ? this.endFloor : this.floor) - cam.y;
    const base = Math.round(floor - RH + this.sink);          // top of the robot at rest
    const top = Math.round(base - this.lift);
    // treads
    const ty = base + 20;
    ctx.fillStyle = INK; ctx.fillRect(x + 3, ty - 1, RW - 6, 10); ctx.fillRect(x + 1, ty + 1, RW - 2, 6);
    ctx.fillStyle = C('#2a2d38'); ctx.fillRect(x + 4, ty, RW - 8, 8); ctx.fillRect(x + 2, ty + 2, RW - 4, 4);
    const off = ((this.tread || 0) >> 1) & 3;
    ctx.fillStyle = C('#5a6070');
    for (let i = 4 + off; i < RW - 4; i += 4) { ctx.fillRect(x + i, ty, 2, 1); ctx.fillRect(x + RW - i - 2, ty + 7, 2, 1); }
    for (const wx of [8, 18, 30, 40]) {
      disc(ctx, x + wx, ty + 4, 3, 'steel.3');
      ctx.fillStyle = C('steel.1'); ctx.fillRect(x + wx - 1, ty + 3, 2, 2);
    }
    // base plate
    ctx.fillStyle = INK; ctx.fillRect(x + 2, base + 16, RW - 4, 5);
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 3, base + 17, RW - 6, 3);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 3, base + 17, RW - 6, 1);
    // scissor arms between the base and the raised box
    if (this.lift > 0.5) {
      const y0 = base + 17, y1 = top + 17;
      const stages = Math.max(1, Math.ceil((y0 - y1) / 18));
      const sh = (y0 - y1) / stages;
      for (let s = 0; s < stages; s++) {
        const a = y0 - s * sh, b = a - sh;
        for (const [lx0, lx1] of [[10, 38], [38, 10]]) {
          line(ctx, x + lx0, a, x + lx1, b, 'steel.1');
          line(ctx, x + lx0 + 1, a, x + lx1 + 1, b, 'steel.3');
        }
        ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 23, Math.round((a + b) / 2) - 1, 3, 3);
      }
    }
    // wings that plug the shaft
    if (this.wings > 0) {
      const w = Math.round(this.wings);
      for (const [wx, ww] of [[x - w, w], [x + RW, w]]) {
        ctx.fillStyle = INK; ctx.fillRect(wx, top - 1, ww, 6);
        ctx.fillStyle = C('steel.3'); ctx.fillRect(wx, top, ww, 4);
        ctx.fillStyle = C('gold.2'); ctx.fillRect(wx, top + 3, ww, 1);
      }
    }
    // the box
    ctx.fillStyle = INK; ctx.fillRect(x, top - 1, RW, 19);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 1, top, RW - 2, 3);            // deck plate
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x + 1, top, RW - 2, 1);
    ctx.fillStyle = C('orange.2'); ctx.fillRect(x + 1, top + 3, RW - 2, 14);
    ctx.fillStyle = C('orange.3'); ctx.fillRect(x + 1, top + 3, RW - 2, 1); ctx.fillRect(x + 1, top + 3, 1, 14);
    ctx.fillStyle = C('orange.1'); ctx.fillRect(x + 1, top + 15, RW - 2, 2);
    ctx.fillStyle = C('white.2'); ctx.fillRect(x + 1, top + 12, 26, 2);              // rescue stripe
    // deck pad, live while it waits under the shaft
    const parked = !this.task && this.done === 2 && Math.abs(this.x - this.shaftX) < 0.5 && this.where === 'house';
    if (parked) {
      const k = (Math.sin(t / 8) + 1) / 2;
      ctx.fillStyle = k > 0.5 ? C('cyan.3') : C('cyan.2'); ctx.fillRect(x + 6, top, RW - 12, 2);
    }
    // status screen: what instruction it is running
    ctx.fillStyle = INK; ctx.fillRect(x + 5, top + 4, 18, 8);
    ctx.fillStyle = C('#0f1a24'); ctx.fillRect(x + 6, top + 5, 16, 6);
    this.icon(ctx, x + 6, top + 5, t);
    // the eye
    const ex = x + 36, ey = top + 9;
    disc(ctx, ex, ey, 6, 'ink.0');
    disc(ctx, ex, ey, 5, 'white.1');
    const blink = !this.escape && (this.t % 210) < 6;
    if (blink) { ctx.fillStyle = C('orange.2'); ctx.fillRect(ex - 5, ey - 5, 11, 11); ctx.fillStyle = INK; ctx.fillRect(ex - 4, ey, 9, 1); }
    else if (this.where === 'street') {
      // happy: the eye squints into an arch
      ctx.fillStyle = C('cyan.2');
      ctx.fillRect(ex - 2, ey - 2, 5, 2); ctx.fillRect(ex - 3, ey - 1, 2, 3); ctx.fillRect(ex + 2, ey - 1, 2, 3);
    } else {
      const lookX = clamp(Math.round((L.hero.x - (this.x + 36)) / 40), -1, 1);
      disc(ctx, ex + lookX, ey, 3, 'cyan.2');
      ctx.fillStyle = INK; ctx.fillRect(ex + lookX - 1, ey - 1, 2, 2);
      ctx.fillStyle = C('white.2'); ctx.fillRect(ex + lookX + 1, ey - 2, 1, 1);
    }
    // foam cannon
    ctx.fillStyle = INK; ctx.fillRect(x + RW - 1, top + 11, 6, 5);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + RW - 1, top + 12, 5, 3);
    // antenna: lights up while it hears a command
    const heard = this.voice && this.voice.t > 30;
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 4, top - 8, 1, 8);
    ctx.fillStyle = INK; ctx.fillRect(x + 3, top - 11, 4, 4);
    ctx.fillStyle = heard ? C('cyan.3') : ((t >> 5) & 1 ? C('green.2') : C('green.1')); ctx.fillRect(x + 4, top - 10, 2, 2);
    // the instruction it is running: over its head, or beside it while
    // the hero rides the deck
    let tag = null, bg = '#12456a', fg = '#e3f6ff';
    if (this.task) tag = DOING[this.task.step];
    else if (this.voice && this.voice.t > 30) tag = 'Heard: ' + STEPS[this.voice.step].toLowerCase();
    else if (parked && L.hero.ground !== this.plat) { tag = 'Hop on: “Lift”'; bg = '#1d6b43'; fg = '#e9fbe9'; }
    else if (this.done === 2 && this.where === 'house' && Math.abs(this.x - this.parkX) > 1) tag = 'To the lift';
    if (tag) {
      const riding = L.hero.ground === this.plat;
      const tx = riding ? x + RW + 12 + textWidth(tag, 6.5, 700) / 2 : x + RW / 2;
      tagPill(ctx, tx, riding ? top + 2 : top - 26, tag, bg, fg);
    }
  }

  icon(ctx, x, y, t) {
    const c = C('cyan.3');
    ctx.fillStyle = c;
    const s = this.task ? this.task.step : this.voice ? -1 : -2;
    if (s === -1) {                                 // listening: waveform
      for (let i = 0; i < 5; i++) { const h = 1 + Math.round(Math.abs(Math.sin(t / 3 + i)) * 4); ctx.fillRect(x + 2 + i * 3, y + 3 - Math.floor(h / 2), 2, h); }
    } else if (s === 0) {                           // forward
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i, y + 1 + i, 1, 5 - i * 2);
      ctx.fillRect(x + 9, y + 2, 3, 2);
    } else if (s === 1) {                           // foam drops
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 4, y + 1 + ((t >> 2) + i) % 3, 2, 2);
    } else if (s === 2) {                           // up
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 7 - i, y + 1 + i, 1 + i * 2, 1);
      ctx.fillRect(x + 7, y + 4, 1, 2);
    } else if (this.where === 'street') {
      ctx.fillStyle = C('green.3'); ctx.fillRect(x + 4, y + 3, 2, 1); ctx.fillRect(x + 6, y + 4, 1, 1); ctx.fillRect(x + 7, y + 3, 1, 1); ctx.fillRect(x + 8, y + 2, 1, 1); ctx.fillRect(x + 9, y + 1, 1, 1);
    } else if ((t >> 4) & 1) {
      ctx.fillRect(x + 2, y + 4, 2, 1);             // idle cursor
    }
  }
}
const p0 = (r) => r.plat.y;            // current top of the box

// ─── voice pads ──────────────────────────────────────────────────────

class Pad {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE; this.y = floorBelow(level.map, tx, ty); this.w = 2 * TILE;
    this.cmd = spec.cmd; this.step = spec.step;
  }
  robot() { return this._r || (this._r = this.level.setpieces.find((s) => s instanceof Robot)); }
  state() {
    const r = this.robot();
    if (!r) return 'off';
    if (r.done > this.step || r.want > this.step) return 'used';
    return 'ready';
  }
  update(level) {
    const h = level.hero, r = this.robot();
    if (!r || this.state() !== 'ready') return;
    const cx = h.x + h.w / 2;
    if (h.grounded && cx > this.x + 2 && cx < this.x + this.w - 2 && Math.abs(h.y + h.h - this.y) < 2) r.hear(this.step);
  }
  draw(ctx, cam, t) {
    if (!onScreen(this.x, this.w, cam, ctx)) return;
    const x = this.x - cam.x, y = this.y - cam.y, st = this.state();
    ctx.fillStyle = INK; ctx.fillRect(x, y - 3, this.w, 4);
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 1, y - 2, this.w - 2, 2);
    const lit = st === 'ready' ? (((t >> 4) & 1) ? 'cyan.3' : 'cyan.2') : 'green.1';
    ctx.fillStyle = C(lit); ctx.fillRect(x + 3, y - 2, this.w - 6, 1);
    // a little microphone on the plate
    ctx.fillStyle = INK; ctx.fillRect(x + 13, y - 11, 6, 9);
    ctx.fillStyle = C(st === 'ready' ? 'white.1' : 'slate.3'); ctx.fillRect(x + 14, y - 10, 4, 5);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x + 15, y - 5, 2, 3);
    // the command it carries
    const label = st === 'ready' ? 'Say “' + this.cmd + '”' : this.cmd + ' ✓';
    const bob = st === 'ready' ? Math.round(Math.sin(t / 12)) : 0;
    tagPill(ctx, x + this.w / 2, y - 40 + bob, label, st === 'ready' ? '#14203a' : '#1d3a2a', st === 'ready' ? '#ffd166' : '#90eaa8');
  }
}

// ─── a wall of fire the robot foams away ─────────────────────────────

class FireWall {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.tx = tx; this.ty = ty; this.tw = spec.w || 2; this.th = spec.h || 4;
    this.x = tx * TILE; this.y = ty * TILE; this.w = this.tw * TILE; this.h = this.th * TILE;
    this.k = 1; this.dousing = false;
    this.setOut(false);
  }
  setOut(out) {
    this.out = out; this.dousing = false; this.k = out ? 0 : 1;
    this.flags(!out);
  }
  flags(on) {
    for (let j = 0; j < this.th; j++) for (let i = 0; i < this.tw; i++) this.level.map.setFlag(this.tx + i, this.ty + j, on ? SOLID : 0);
  }
  douse(level) { if (!this.out) { this.dousing = true; level.sfx('break'); } }
  update(level) {
    if (this.dousing) {
      this.k = Math.max(0, this.k - 1 / 60);
      if ((level.t & 3) === 0) level.game.particles.one(this.x + Math.random() * this.w, this.y + this.h * (1 - this.k), (Math.random() - 0.5) * 0.4, -0.6, C('white.1'), 30, -0.005, 2);
      if (this.k < 0.3) this.flags(false);
      if (this.k <= 0) { this.out = true; this.dousing = false; }
    }
    if (this.out || this.k < 0.3) return;
    const h = level.hero;
    if (overlaps(h, { x: this.x - 2, y: this.y, w: this.w + 4, h: this.h })) level.hurtHero(this.x + this.w / 2);
  }
  draw(ctx, cam, t) {
    if (!onScreen(this.x, this.w, cam, ctx)) return;
    const x = this.x - cam.x, base = this.y + this.h - cam.y;
    if (this.k > 0) {
      ctx.fillStyle = `rgba(255,110,40,${(0.18 * this.k).toFixed(3)})`; ctx.fillRect(x - 10, this.y - cam.y, this.w + 20, this.h);
      flames(ctx, x - 2, base, this.w + 4, Math.round(this.h * this.k * 1.05), this.level.game.reduced ? 0 : t, 3);
    }
    if (this.out || this.dousing) {
      // foam left on the floor
      const fade = this.out ? 1 : 1 - this.k;
      ctx.fillStyle = C('white.2');
      for (let i = 0; i < 6; i++) disc(ctx, x + 3 + i * 5, base - 2, 3 + ((i * 7) % 3), fade > 0.5 ? 'white.2' : 'white.1');
    }
  }
}

// ─── floor vents: glow and smoke, then flare ─────────────────────────
// idle 1.5 s → warning 0.67 s (grate glows, smoke rises, small licks) →
// flame 1.1 s (damage) → out. Neighbouring vents are staggered so a
// steady walk can roll through them.

class Vent {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE; this.w = 2 * TILE;
    this.floor = floorBelow(level.map, tx, ty);
    // under a ceiling the flame fills the room; in the open it stands well
    // over head height, so the rule is the same everywhere: wait for it
    const ceil = ceilingAbove(level.map, tx, ty);
    this.maxH = ceil > 0 ? this.floor - ceil : (spec.max || 48);
    this.P = spec.period || 200;
    this.ph = { warn: 90, burn: 130, out: 196 };
    // each vent fires a little later than the one before it, so walking at a
    // steady pace right after one goes out carries you through the next
    const off = (spec.offset || 0) - tx * (spec.stagger || 9);
    this.off = ((off % this.P) + this.P) % this.P;
  }
  phase() { return (this.level.t + this.off) % this.P; }
  height() {
    const p = this.phase(), { burn, out } = this.ph;
    if (p < burn || p >= out + 4) return 0;
    if (p < burn + 6) return this.maxH * ((p - burn) / 6);
    if (p >= out) return this.maxH * (1 - (p - out) / 4);
    return this.maxH;
  }
  update(level) {
    const p = this.phase(), hh = this.height();
    if (hh > 6) {
      const flame = { x: this.x + 5, y: this.floor - hh, w: this.w - 10, h: hh };
      if (overlaps(level.hero, flame)) level.hurtHero(this.x + this.w / 2);
    }
    if (p >= this.ph.warn && p < this.ph.burn && (p & 3) === 0 && Math.abs(this.x - level.camX - level.W / 2) < level.W) {
      level.game.particles.one(this.x + 6 + Math.random() * 20, this.floor - 2, (Math.random() - 0.5) * 0.3, -0.7, C('slate.3'), 26, -0.01, 2);
    }
  }
  draw(ctx, cam, t) {
    if (!onScreen(this.x, this.w, cam, ctx)) return;
    const x = this.x - cam.x, y = this.floor - cam.y, p = this.phase();
    const warn = p >= this.ph.warn && p < this.ph.burn;
    const k = warn ? (p - this.ph.warn) / (this.ph.burn - this.ph.warn) : 0;
    // the grate
    ctx.fillStyle = INK; ctx.fillRect(x + 2, y - 2, this.w - 4, 4);
    ctx.fillStyle = C('steel.2'); ctx.fillRect(x + 3, y - 2, this.w - 6, 3);
    const glow = warn ? ((t >> 2) & 1 ? 'gold.3' : 'orange.2') : this.height() > 0 ? 'gold.3' : 'red.1';
    for (let i = 5; i < this.w - 5; i += 4) { ctx.fillStyle = C(glow); ctx.fillRect(x + i, y - 1, 2, 2); }
    if (warn) {
      ctx.fillStyle = `rgba(255,140,40,${(0.12 + 0.2 * k).toFixed(3)})`; ctx.fillRect(x, y - 14, this.w, 14);
      flames(ctx, x + 6, y - 1, this.w - 12, 3 + Math.round(k * 6), t, 1);
    }
    const hh = this.height();
    if (hh > 0) {
      ctx.fillStyle = 'rgba(255,120,40,0.18)'; ctx.fillRect(x - 6, y - hh, this.w + 12, hh);
      flames(ctx, x + 3, y - 1, this.w - 6, Math.round(hh), this.level.game.reduced ? 0 : t, this.x);
    }
  }
}

// ─── burnt planks: crack for half a second, then drop ────────────────

class Planks {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.list = [];
    for (let i = 0; i < spec.n; i++) {
      const x = (tx + i * spec.w) * TILE, y = ty * TILE, w = spec.w * TILE;
      const p = platform(x, y, w, 4);
      level.platforms.push(p);
      this.list.push({ x, y, w, p, st: 'ok', t: 0, fy: 0, vy: 0 });
    }
    level.enemies.push({ alive: true, x: -999, y: -999, w: 0, h: 0, stompable: () => false, update() {}, draw() {}, reset: () => this.reset() });
  }
  reset() { for (const k of this.list) { k.st = 'ok'; k.t = 0; k.fy = 0; k.vy = 0; k.p.active = true; } }
  update(level) {
    const h = level.hero;
    for (const k of this.list) {
      k.t++;
      if (k.st === 'ok' && h.ground === k.p && h.grounded) { k.st = 'shake'; k.t = 0; level.sfx('tick'); }
      else if (k.st === 'shake' && k.t >= 32) { k.st = 'fall'; k.t = 0; k.p.active = false; level.sfx('break'); }
      else if (k.st === 'fall') { k.vy += 0.3; k.fy += k.vy; if (k.t > 70) { k.st = 'gone'; k.t = 0; } }
      else if (k.st === 'gone' && k.t > 150 && !(h.x + h.w > k.x - 8 && h.x < k.x + k.w + 8 && h.y > k.y - 30)) { k.st = 'ok'; k.t = 0; k.fy = 0; k.vy = 0; k.p.active = true; }
    }
  }
  draw(ctx, cam, t) {
    for (const k of this.list) {
      if (k.st === 'gone') continue;
      if (!onScreen(k.x, k.w, cam, ctx)) continue;
      const shake = k.st === 'shake' ? ((t >> 1) & 1 ? 1 : -1) : 0;
      const x = Math.round(k.x - cam.x + shake), y = Math.round(k.y - cam.y + k.fy);
      ctx.fillStyle = INK; ctx.fillRect(x, y - 1, k.w, 7);
      ctx.fillStyle = C('wood.1'); ctx.fillRect(x + 1, y, k.w - 2, 5);
      ctx.fillStyle = C('wood.2'); ctx.fillRect(x + 1, y, k.w - 2, 1);
      ctx.fillStyle = C('#2a1410'); ctx.fillRect(x + 1, y + 4, k.w - 2, 1);
      // char and embers along the edge; cracks open while it shakes
      for (let i = 3; i < k.w - 3; i += 7) { ctx.fillStyle = C((i + (t >> 3)) % 3 ? 'red.2' : 'orange.2'); ctx.fillRect(x + i, y + 3, 2, 1); }
      ctx.fillStyle = C('wood.0'); ctx.fillRect(x + k.w / 2, y, 1, 5);
      if (k.st !== 'ok') {
        ctx.fillStyle = INK;
        ctx.fillRect(x + 8, y, 1, 3); ctx.fillRect(x + 9, y + 2, 1, 3);
        ctx.fillRect(x + k.w - 10, y + 1, 1, 4); ctx.fillRect(x + k.w - 11, y, 1, 2);
      }
    }
  }
}

// ─── the 1st-place trophy at the exit ────────────────────────────────

class Trophy {
  constructor(tx, ty, spec, level) {
    this.level = level;
    this.x = tx * TILE - 8; this.floor = floorBelow(level.map, tx, ty);
    this.fact = spec.fact;
    this.got = level.game.progress.hasFact(this.fact);
    this.rise = this.got ? 1 : 0;
  }
  update(level) {
    if (this.got) { this.rise = Math.min(1, this.rise + 1 / 40); return; }
    const box = { x: this.x + 6, y: this.floor - 44, w: 20, h: 44 };
    if (overlaps(level.hero, box)) {
      this.got = true;
      level.discover(this.fact, this.x + 16, this.floor - 34);
      level.game.particles.burst(this.x + 16, this.floor - 30, 18, [C('gold.3'), C('gold.2'), C('white.2'), C('cyan.3')], { speed: 2, up: 1.6, life: 40, grav: 0.06 });
    }
  }
  draw(ctx, cam, t) {
    if (!onScreen(this.x - 20, 72, cam, ctx)) return;
    const x = this.x - cam.x, f = this.floor - cam.y;
    // podium
    ctx.fillStyle = INK; ctx.fillRect(x - 1, f - 13, 34, 13);
    ctx.fillStyle = C('steel.3'); ctx.fillRect(x, f - 12, 32, 12);
    ctx.fillStyle = C('steel.4'); ctx.fillRect(x, f - 12, 32, 1);
    ctx.fillStyle = C('gold.2'); ctx.fillRect(x + 2, f - 9, 28, 1);
    drawText(ctx, '1', x + 16, f - 11, '#ffe08a', { align: 'center', size: 7, weight: 700 });
    // the cup, lifting a little once won
    const lift = Math.round(ease.outBack(this.rise) * 6) + (this.got ? Math.round(Math.sin(t / 18)) : 0);
    const cx = x + 16, cy = f - 14 - lift;
    if (this.got) { ctx.fillStyle = 'rgba(255,224,138,0.18)'; ctx.beginPath(); ctx.arc(cx, cy - 10, 16, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = INK; ctx.fillRect(cx - 6, cy - 3, 12, 4); ctx.fillRect(cx - 2, cy - 8, 4, 6); ctx.fillRect(cx - 8, cy - 21, 16, 14);
    ctx.fillRect(cx - 11, cy - 19, 4, 8); ctx.fillRect(cx + 7, cy - 19, 4, 8);
    ctx.fillStyle = C('gold.2'); ctx.fillRect(cx - 5, cy - 2, 10, 2); ctx.fillRect(cx - 1, cy - 7, 2, 5); ctx.fillRect(cx - 7, cy - 20, 14, 12);
    ctx.fillStyle = C('gold.1'); ctx.fillRect(cx - 10, cy - 18, 2, 6); ctx.fillRect(cx + 8, cy - 18, 2, 6); ctx.fillRect(cx + 3, cy - 20, 4, 12);
    ctx.fillStyle = C('gold.3'); ctx.fillRect(cx - 6, cy - 19, 2, 9); ctx.fillRect(cx - 7, cy - 20, 14, 1);
    if (this.got && ((t >> 3) & 7) === 0) { ctx.fillStyle = C('white.2'); ctx.fillRect(cx - 5, cy - 17, 1, 3); ctx.fillRect(cx - 6, cy - 16, 3, 1); }
    // the plaque
    const ly = f + 3;
    drawText(ctx, '1st place', cx, ly, '#ffd166', { align: 'center', shadow: INK, size: 7.5, weight: 700 });
    drawText(ctx, 'Omi category', cx, ly + lineHeight(7.5), '#e3e6ee', { align: 'center', shadow: INK, size: 6.5, weight: 600 });
  }
}

registerSetpiece('droidScene', Scene);
registerSetpiece('droidRobot', Robot);
registerSetpiece('droidPad', Pad);
registerSetpiece('droidFireWall', FireWall);
registerSetpiece('droidVent', Vent);
registerSetpiece('droidPlanks', Planks);
registerSetpiece('droidTrophy', Trophy);

// ─── enemies: embers that hop, smoke that drifts ─────────────────────

class Ember extends Enemy {
  constructor(tx, ty) { super(tx * TILE + 2, (ty + 1) * TILE - 12, 12, 12); }
  reset() { super.reset(); this.wait = 50; this.t = 0; this.vx = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 24) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.vy = Math.min(this.vy + 0.3, 4);
    if (this.grounded) {
      this.vx = 0;
      if (--this.wait <= 0) {
        // hop at the hero, but never stray more than three tiles from home
        const hx = level.hero.x + level.hero.w / 2;
        const away = this.x - this.spawnX;
        this.vx = (Math.abs(away) > 48 ? -Math.sign(away) : Math.sign(hx - (this.x + 6))) * 0.8;
        this.vy = -4.2;
        this.wait = 80 + ((this.spawnX * 7) % 30);
      }
    }
    const res = moveBody(this, level.map, level.platforms.filter((p) => !p.robot));
    if (res.wall) this.vx = -this.vx;
    if (this.y > level.map.h + 32) this.alive = false;
  }
  stomp(level) {
    this.flat = 1;
    const x = this.x + 6;
    level.stats.bugs++; level.game.progress.stat('bugs'); level.sfx('stomp');
    level.floaters.push(new Floater(x, this.y - 8, 'Ember out', '#a8ecff', 46));
    level.game.particles.burst(x, this.y + 6, 8, [C('white.1'), C('slate.3')], { speed: 1, up: 1.2, life: 24, grav: -0.02 });
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    const cx = x + 6, cy = y + 7;
    if (this.flat) {
      ctx.fillStyle = C('#2a1410'); ctx.fillRect(x, y + 9, 12, 3);
      ctx.fillStyle = C('slate.3'); ctx.fillRect(x + 2, y + 9, 8, 1);
      return;
    }
    const crouch = this.grounded && this.wait < 12 ? 1 : 0;
    // a flame tuft, flickering
    flames(ctx, cx - 4, cy - 3 + crouch, 8, 7 + ((t >> 2) & 1) * 2, t, this.spawnX);
    disc(ctx, cx, cy + crouch, 6, 'ink.0');
    disc(ctx, cx, cy + crouch, 5, '#3a1a12');
    ctx.fillStyle = C((t >> 3) & 1 ? 'orange.2' : 'red.2');
    ctx.fillRect(cx - 3, cy + 2 + crouch, 3, 1); ctx.fillRect(cx + 1, cy + 3 + crouch, 2, 1); ctx.fillRect(cx + 2, cy - 3 + crouch, 1, 2);
    ctx.fillStyle = C('gold.3'); ctx.fillRect(cx - 3, cy - 2 + crouch, 2, 2); ctx.fillRect(cx + 1, cy - 2 + crouch, 2, 2);
    ctx.fillStyle = INK; ctx.fillRect(cx - 4, cy - 4 + crouch, 3, 1); ctx.fillRect(cx + 1, cy - 4 + crouch, 3, 1);
  }
}

class Smoke extends Enemy {
  constructor(tx, ty) { super(tx * TILE - 1, ty * TILE + 1, 18, 13); }
  reset() { super.reset(); this.t = 0; }
  update(level) {
    this.prevX = this.x; this.prevY = this.y;
    if (this.flat) { if (++this.flat > 26) this.alive = false; return; }
    if (!this.wake(level)) return;
    this.t++;
    this.x = this.spawnX - Math.sin(this.t / 90) * 36;
    this.y = this.spawnY + Math.sin(this.t / 24) * 4;
  }
  stomp(level) {
    this.flat = 1;
    level.stats.bugs++; level.game.progress.stat('bugs'); level.sfx('stomp');
    level.floaters.push(new Floater(this.x + 9, this.y - 8, 'Smoke cleared', '#a8ecff', 46));
  }
  draw(ctx, cam, t, A, level, alpha) {
    const x = Math.round(lerp(this.prevX, this.x, alpha) - cam.x), y = Math.round(lerp(this.prevY, this.y, alpha) - cam.y);
    const k = this.flat ? Math.min(1, this.flat / 20) : 0;
    if (k >= 1) return;
    ctx.save(); ctx.globalAlpha = 1 - k;
    const blobs = [[4, 8, 5], [9, 5, 6], [14, 8, 5], [9, 9, 5]];
    for (const [bx, by, r] of blobs) disc(ctx, x + bx, y + by - k * 6, r + 1, 'ink.0');
    for (const [bx, by, r] of blobs) disc(ctx, x + bx, y + by - k * 6, r, '#5a5560');
    disc(ctx, x + 8, y + 4 - k * 6, 3, '#7d7682');
    disc(ctx, x + 12, y + 5 - k * 6, 2, '#9a94a0');
    // wisps trailing behind
    const wv = Math.round(Math.sin(t / 8) * 1);
    ctx.fillStyle = C('#5a5560'); ctx.fillRect(x - 3, y + 9 + wv, 3, 2); ctx.fillRect(x + 18, y + 7 - wv, 3, 2);
    ctx.restore();
    if (this.flat) return;
    const look = level.hero.x + 5 < this.x + 9 ? -1 : 1;
    for (const ex of [5, 11]) {
      ctx.fillStyle = '#fbf8f1'; ctx.fillRect(x + ex, y + 6, 3, 3);
      ctx.fillStyle = INK; ctx.fillRect(x + ex + (look > 0 ? 1 : 0), y + 7, 2, 2);
    }
  }
}

registerEnemy('j', Ember);
registerEnemy('y', Smoke);

// ─── music: urgent, minor, driving ───────────────────────────────────

registerSong('droidFire', {
  bpm: 144,
  lead: steps('E5 . G5 . B5 . A5 G5 | F#5 . D5 . E5 . . . | C5 . E5 . G5 . F#5 E5 | D#5 . F#5 . B4 . . . | E5 . G5 . B5 . D6 B5 | C6 . A5 . E5 . . . | A5 . G5 . F#5 . E5 D#5 | E5 . B4 . E5 . . .'),
  bass: steps('E2 E3 E2 E3 E2 E3 E2 E3 | D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 B1 B2 B1 B2 | E2 E3 E2 E3 E2 E3 E2 E3 | A1 A2 A1 A2 A1 A2 A1 A2 | C2 C3 C2 C3 B1 B2 B1 B2 | E2 E3 E2 E3 E2 . E2 .'),
  drums: steps('k . h k s . h . | k . h k s . h h | k . h k s . h . | k k h k s s s s'),
});

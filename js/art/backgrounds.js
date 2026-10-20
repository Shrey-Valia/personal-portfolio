// Procedural parallax backdrops, one per theme. Layers are drawn once
// into repeating strips; at runtime each strip is blitted twice.

import { H } from '../config.js';
import { col } from './palette.js';
import { stripedSky, disc, noise1 } from './draw.js';
import { makeCanvas, rng } from '../engine/util.js';

export function strip(w, paint) {
  const [c, ctx] = makeCanvas(w, H);
  paint(ctx, w);
  return c;
}

export function blitStrip(ctx, s, camX, f, y = 0) {
  const w = s.width;
  let x = -Math.floor(camX * f) % w;
  if (x > 0) x -= w;
  y = Math.round(y);
  for (; x < ctx.W; x += w) ctx.drawImage(s, x, y);
}

// ─── Oak Ridge at dawn: ridges, the lab campus, a pine treeline ──────

function labDawn(W) {
  const sky = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#141a3d', '#1f2557', '#352d69', '#5c3570', '#8f4170', '#c4566a', '#e9795f', '#f7a865']);
    // sun just above the ridges, with a soft halo
    disc(ctx, Math.round(W * 0.68), 128, 30, '#f5915f');
    disc(ctx, Math.round(W * 0.68), 128, 22, '#ffc27a');
    disc(ctx, Math.round(W * 0.68), 128, 16, '#ffe3a6');
  });

  const ridges = strip(640, (ctx, w) => {
    const layers = [
      { base: 132, amp: 20, freq: 0.012, c: '#8a5583', seed: 3 },
      { base: 146, amp: 18, freq: 0.018, c: '#664277', seed: 7 },
      { base: 160, amp: 14, freq: 0.026, c: '#45356a', seed: 11 },
    ];
    for (const L of layers) {
      const n = noise1(L.seed);
      ctx.fillStyle = col(L.c);
      for (let x = 0; x < w; x++) {
        // wrap the noise so the strip tiles seamlessly
        const t = x / w;
        const v = n(t * w * L.freq) * (1 - t) + n((t - 1) * w * L.freq + 256) * t;
        const y = Math.round(L.base - v * L.amp);
        ctx.fillRect(x, y, 1, H - y);
      }
    }
  });

  const campus = strip(768, (ctx, w) => {
    const r = rng(42);
    const body = col('#1b1d40'), lit = col('#ffd27a'), lit2 = col('#ff9d5c'), edge = col('#2b2b5a');
    let x = 0;
    while (x < w) {
      const bw = 28 + Math.floor(r() * 46), bh = 18 + Math.floor(r() * 30);
      const top = H - 40 - bh;
      ctx.fillStyle = body; ctx.fillRect(x, top, bw, H - top);
      ctx.fillStyle = edge; ctx.fillRect(x, top, bw, 1);
      for (let wy = top + 4; wy < H - 44; wy += 5) for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
        const k = r();
        if (k < 0.32) { ctx.fillStyle = k < 0.08 ? lit2 : lit; ctx.fillRect(wx, wy, 2, 2); }
      }
      if (r() < 0.25) {                       // a dome
        const cx = x + bw / 2, rr = Math.min(14, bw / 2 - 2);
        for (let dy = 0; dy <= rr; dy++) {
          const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
          ctx.fillStyle = body; ctx.fillRect(cx - half, top - dy, half * 2, 1);
        }
        ctx.fillStyle = edge; ctx.fillRect(cx - 1, top - rr - 1, 2, 1);
      } else if (r() < 0.3) {                 // a stack
        ctx.fillStyle = body; ctx.fillRect(x + bw - 8, top - 26, 5, 26);
      }
      x += bw + 2 + Math.floor(r() * 10);
    }
  });

  const pines = strip(512, (ctx, w) => {
    const r = rng(9);
    const c = col('#0e1130'), c2 = col('#151a3e');
    ctx.fillStyle = c2; ctx.fillRect(0, H - 34, w, 34);
    for (let x = -10; x < w + 10; x += 6 + Math.floor(r() * 7)) {
      const th = 22 + Math.floor(r() * 26);
      ctx.fillStyle = r() < 0.4 ? c2 : c;
      for (let y = 0; y < th; y++) {
        const half = Math.floor((y / th) * 7) + ((y & 3) === 3 ? 1 : 0);
        ctx.fillRect(((x + w) % w) - half, H - 30 - th + y, half * 2 + 1, 1);
      }
    }
    ctx.fillStyle = c; ctx.fillRect(0, H - 30, w, 30);
  });

  return {
    draw(ctx, camX, camY, t, reduced) {
      const k = reduced ? 0 : 1;
      ctx.drawImage(sky, 0, 0);
      blitStrip(ctx, ridges, camX, 0.08 * k, -camY * 0.1);
      blitStrip(ctx, campus, camX, 0.22 * k, -camY * 0.2);
      // aircraft warning lights on the stacks blink
      blitStrip(ctx, pines, camX, 0.5 * k, -camY * 0.4);
    },
  };
}

// ─── inside the lab: dark panels, faint grid ─────────────────────────

function labInside(W) {
  const bg = strip(W, (ctx) => {
    stripedSky(ctx, W, H, ['#0a0c1f', '#0f1430', '#151b3d', '#1a2147']);
    ctx.fillStyle = col('#1f2a55');
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, H);
    for (let y = 8; y < H; y += 24) ctx.fillRect(0, y, W, 1);
  });
  return { draw(ctx) { ctx.drawImage(bg, 0, 0); } };
}

// ─── home: Shrey's room in Dublin, CA, golden hour ──────────────────

function homeRoom() {
  const [c, ctx] = makeCanvas(480, 224);
  const wall = col('#463a5c'), wall2 = col('#3d3352'), trim = col('#2b2340');
  stripedSky(ctx, 480, 176, [wall2, wall, wall]);
  ctx.fillStyle = trim; ctx.fillRect(0, 176, 480, 16);

  // the window: golden Tri-Valley hills at sunset
  const wx = 300, wy = 40, ww = 120, wh = 84;
  const [win, wctx] = makeCanvas(ww, wh);
  stripedSky(wctx, ww, wh, ['#ffcf7a', '#ffb062', '#ff8f5c', '#f07058']);
  disc(wctx, 82, 58, 9, '#fff0c0');
  const hill = noise1(5), hill2 = noise1(8);
  for (let x = 0; x < ww; x++) {
    const y1 = Math.round(52 + hill(x * 0.05) * 12);
    wctx.fillStyle = col('#c98a3c'); wctx.fillRect(x, y1, 1, wh - y1);
    const y2 = Math.round(64 + hill2(x * 0.07) * 10);
    wctx.fillStyle = col('#a0652c'); wctx.fillRect(x, y2, 1, wh - y2);
  }
  // valley oaks
  for (const [ox, oy] of [[18, 66], [44, 70], [96, 68]]) disc(wctx, ox, oy, 4, '#5e3d1d');
  ctx.drawImage(win, wx, wy);
  ctx.fillStyle = col('#2b2340');
  ctx.fillRect(wx - 4, wy - 4, ww + 8, 4); ctx.fillRect(wx - 4, wy + wh, ww + 8, 6);
  ctx.fillRect(wx - 4, wy, 4, wh); ctx.fillRect(wx + ww, wy, 4, wh);
  ctx.fillRect(wx + ww / 2 - 1, wy, 3, wh); ctx.fillRect(wx, wy + wh / 2 - 1, ww, 3);
  // light spilling onto the wall
  ctx.fillStyle = 'rgba(255, 190, 110, 0.10)';
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww - 40, 176); ctx.lineTo(wx - 60, 176); ctx.fill();

  // poster: a pixel </> mark
  ctx.fillStyle = col('#1b2142'); ctx.fillRect(120, 54, 54, 70);
  ctx.fillStyle = col('teal.2');
  const glyph = ['..x.......x..', '.x...x.....x.', 'x...x.......x', '.x.x.......x.', '..x.......x..'];
  glyph.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'x') ctx.fillRect(128 + i * 3, 74 + j * 3, 3, 3); }));
  ctx.fillStyle = col('gold.2'); ctx.fillRect(126, 108, 42, 2);

  // bed on the left
  ctx.fillStyle = col('#2d3a6e'); ctx.fillRect(16, 150, 84, 26);
  ctx.fillStyle = col('#3e4fa3'); ctx.fillRect(16, 150, 84, 6);
  ctx.fillStyle = col('#e3e6ee'); ctx.fillRect(20, 142, 22, 10);
  ctx.fillStyle = col('wood.1'); ctx.fillRect(12, 132, 6, 44);
  return { draw(ctx2, camX, camY) { ctx2.fillStyle = col('#05060c'); ctx2.fillRect(0, 0, ctx2.W, 216); ctx2.drawImage(c, -camX, -camY); } };
}

const BUILDERS = { lab: labDawn, labInterior: labInside, home: () => homeRoom() };

// themes add backdrops: build(W) → { draw(ctx, camX, camY, t, reduced) }
export function registerBackground(name, build) { BUILDERS[name] = build; }

const cache = new Map();
export function getBackground(theme, W) {
  const key = theme + ':' + W;
  if (!cache.has(key)) cache.set(key, BUILDERS[theme](W));
  return cache.get(key);
}

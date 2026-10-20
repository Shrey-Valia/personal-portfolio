// Shrey Island: the overworld base art, drawn once at 480×216.
// Sky and a cloud band up top for the remote work; the island below, with a
// landmark at each node that depicts its subject.

import { col } from './palette.js';
import { disc, noise1, noise2, line } from './draw.js';
import { makeCanvas } from '../engine/util.js';
import { NODES } from '../game/map.js';

const ISLAND = [
  [252, 162, 206, 46],
  [112, 188, 72, 30],
  [298, 198, 96, 22],
  [398, 174, 46, 30],
];

export const HORIZON = 92;

export function islandDist(x, y) {
  let d = Infinity;
  for (const [cx, cy, rx, ry] of ISLAND) {
    const v = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (v < d) d = v;
  }
  return d;
}

function puff(ctx, cx, cy, w) {
  const blobs = [[0, 0, 0.5], [-0.32, 0.12, 0.34], [0.34, 0.1, 0.36], [-0.12, -0.2, 0.32], [0.16, -0.16, 0.3]];
  const edge = col('#9aa8c8'), body = col('#f5f7ff'), shade = col('#d6def0');
  for (const pass of [0, 1]) {
    for (const [dx, dy, r] of blobs) {
      const R = Math.round(w * r) + (pass ? 0 : 1);
      disc(ctx, cx + dx * w, cy + dy * w * 0.6, R, pass ? body : edge);
    }
  }
  ctx.fillStyle = shade;
  ctx.fillRect(Math.round(cx - w * 0.55), Math.round(cy + w * 0.12), Math.round(w * 1.1), 3);
}

export function buildMapBase() {
  const [c, ctx] = makeCanvas(480, 216);
  const n = noise1(21);
  const patch = noise2(7), field = noise2(13);
  const rgb = (h) => { const v = parseInt(col(h).slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const SKY = ['#6aa6f2', '#9cc9fa', '#c8e4fd'].map(rgb);
  const deep = rgb('#2163ad'), shallow = rgb('#47a0e0'), foam = rgb('#d8efff');
  const sand = rgb('#ecd08f'), sandEdge = rgb('#cfae69');
  const grass = rgb('grass.2'), grassDark = rgb('grass.1'), meadow = rgb('#6cbf52'), gold = rgb('#a9bb4f');
  const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // flat colours and soft shapes; no dithering
  const img = ctx.createImageData(480, 216);
  for (let y = 0; y < 216; y++) {
    for (let x = 0; x < 480; x++) {
      let f;
      if (y < HORIZON) {
        const t = (y / HORIZON) * 2;
        f = t < 1 ? lerpC(SKY[0], SKY[1], t) : lerpC(SKY[1], SKY[2], t - 1);
      } else {
        const ang = Math.atan2(y - 170, x - 250);
        const d = islandDist(x, y) - n(ang * 6 + 10) * 0.06;
        if (d < 0.9) {
          f = grass;
          const p = patch(x / 26, y / 18);
          if (p > 0.66) f = meadow;
          else if (p < 0.24) f = grassDark;
          // golden Tri-Valley hills around home
          if (Math.hypot(x - 232, (y - 150) * 1.6) < 64 && field(x / 16, y / 11) > 0.66) f = gold;
          if (d > 0.875) f = lerpC(f, sandEdge, 0.5);
        } else if (d < 1) {
          f = d < 0.915 ? sandEdge : sand;
        } else if (d < 1.025) {
          f = foam;
        } else {
          f = lerpC(shallow, deep, Math.min(1, (d - 1.025) / 0.16));
        }
      }
      const o = (y * 480 + x) * 4;
      img.data[o] = f[0]; img.data[o + 1] = f[1]; img.data[o + 2] = f[2]; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // the remote band: a cloud bank with a big cloud under each remote node
  for (let x = 10; x < 480; x += 46) puff(ctx, x, 84 + (x % 3) * 2, 34);
  for (const k of ['vincio', 'trading', 'handshake']) puff(ctx, NODES[k].x, NODES[k].y + 4, 52);
  puff(ctx, 40, 34, 26); puff(ctx, 440, 30, 30); puff(ctx, 180, 26, 18); puff(ctx, 290, 24, 20);

  // landmarks
  for (const [id, nd] of Object.entries(NODES)) LANDMARK[id](ctx, nd.x, nd.y - 7);
  return c;
}

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = col(c); ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const box = (ctx, x, y, w, h, c, hi, lo) => {
  R(ctx, x - 1, y - 1, w + 2, h + 2, 'ink.0');
  R(ctx, x, y, w, h, c);
  if (hi) R(ctx, x, y, w, 1, hi);
  if (lo) R(ctx, x, y + h - 1, w, 1, lo);
};

// each draws centred on (x, bottom)
const LANDMARK = {
  home(ctx, x, b) {
    box(ctx, x - 9, b - 10, 18, 10, '#efe2c4', '#fff4dc', '#c7b48e');
    for (let i = 0; i < 7; i++) R(ctx, x - 11 + i, b - 11 - i, 22 - i * 2, 1, i ? 'indigo.2' : 'ink.0');
    R(ctx, x - 11, b - 11, 22, 1, 'ink.0');
    R(ctx, x - 3, b - 6, 4, 6, 'wood.1');
    box(ctx, x + 3, b - 8, 4, 3, '#ffd27a');
  },
  tree(ctx, x, b) {
    R(ctx, x - 2, b - 8, 4, 8, 'wood.1');
    disc(ctx, x, b - 15, 9, 'ink.0');
    disc(ctx, x, b - 15, 8, 'grass.2');
    disc(ctx, x - 3, b - 18, 4, 'grass.3');
    for (const [dx, dy] of [[-4, -12], [3, -16], [5, -10], [-1, -20]]) R(ctx, x + dx, b + dy, 2, 2, 'gold.2');
  },
  ornl(ctx, x, b) {
    box(ctx, x - 12, b - 9, 24, 9, 'steel.3', 'steel.4', 'steel.1');
    for (let dy = 0; dy < 8; dy++) {
      const half = Math.round(Math.sqrt(64 - dy * dy));
      R(ctx, x - half, b - 10 - dy, half * 2, 1, dy === 7 ? 'ink.0' : 'white.1');
    }
    R(ctx, x - 9, b - 10, 18, 1, 'ink.0');
    for (let i = 0; i < 4; i++) R(ctx, x - 9 + i * 5, b - 6, 3, 2, 'teal.3');
  },
  dhs(ctx, x, b) {
    box(ctx, x - 12, b - 9, 24, 9, '#c96a4a', '#e08a64', '#9a4a32');
    box(ctx, x - 3, b - 17, 6, 8, '#e3e6ee', '#ffffff');
    R(ctx, x - 1, b - 15, 2, 2, 'gold.2');
    for (let i = 0; i < 4; i++) R(ctx, x - 10 + i * 6, b - 6, 3, 3, '#ffd27a');
  },
  neu(ctx, x, b) {
    box(ctx, x - 10, b - 8, 20, 8, '#a8442e', '#c45a3c', '#7a2e1e');
    box(ctx, x - 4, b - 22, 8, 14, '#a8442e', '#c45a3c');
    disc(ctx, x, b - 18, 2, 'white.2');
    R(ctx, x, b - 19, 1, 2, 'ink.0');
    for (let i = 0; i < 3; i++) R(ctx, x - 8 + i * 6, b - 5, 3, 3, '#ffd27a');
  },
  droid(ctx, x, b) {
    box(ctx, x - 8, b - 16, 16, 16, 'slate.2', 'slate.3', 'slate.1');
    for (let i = 0; i < 6; i++) R(ctx, x - 6 + (i % 3) * 5, b - 13 + Math.floor(i / 3) * 6, 3, 3, i % 2 ? 'orange.2' : 'gold.3');
    for (const [dx, h] of [[-6, 6], [-2, 9], [3, 7]]) { R(ctx, x + dx, b - 16 - h, 3, h, 'orange.2'); R(ctx, x + dx + 1, b - 14 - h, 1, h - 3, 'gold.3'); }
    box(ctx, x + 10, b - 6, 6, 6, 'steel.3', 'steel.4');
    R(ctx, x + 12, b - 4, 2, 2, 'cyan.3');
  },
  lighthouse(ctx, x, b) {
    for (let i = 0; i < 18; i++) {
      const w = 6 + Math.floor(i / 6);
      R(ctx, x - w / 2, b - i - 1, w, 1, Math.floor(i / 3) % 2 ? 'red.2' : 'white.2');
    }
    box(ctx, x - 4, b - 24, 8, 5, 'gold.3');
    R(ctx, x - 5, b - 25, 10, 1, 'ink.0');
  },
  vincio(ctx, x, b) {
    box(ctx, x - 10, b - 12, 20, 12, '#1d2033', null, null);
    for (let i = 0; i < 5; i++) R(ctx, x - 9 + i * 4, b - 11, 2, 2, 'white.2');
    for (let i = 0; i < 3; i++) R(ctx, x - 8, b - 8 + i * 3, 16, 2, ['cyan.2', 'green.2', 'gold.2'][i]);
    for (let i = 0; i < 5; i++) R(ctx, x - 10 + i * 4, b - 17 + (i % 2), 3, 4, i % 2 ? 'white.2' : 'ink.0');
  },
  trading(ctx, x, b) {
    box(ctx, x - 12, b - 16, 24, 16, '#0d1a2e');
    const hs = [4, 7, 5, 9, 8, 11];
    hs.forEach((h, i) => {
      const up = i === 0 || h >= hs[i - 1];
      R(ctx, x - 10 + i * 4, b - 2 - h - 2, 1, h + 3, up ? 'green.2' : 'red.2');
      R(ctx, x - 11 + i * 4, b - 2 - h, 3, h, up ? 'green.2' : 'red.2');
    });
  },
  handshake(ctx, x, b) {
    box(ctx, x - 12, b - 10, 24, 10, '#e9e2d0', '#ffffff', '#b8ae96');
    for (let i = 0; i < 3; i++) for (let s = 0; s < 4; s++) R(ctx, x - 12 + i * 8 + s, b - 14 + s, 8 - s * 2, 1, 'orange.2');
    box(ctx, x + 6, b - 20, 4, 10, 'slate.2');
    R(ctx, x - 9, b - 4, 18, 2, 'cyan.2');
  },
};

export function drawPath(ctx, pts, ox, state, t, reveal = 1) {
  // dotted road; 'open' dots are bright, locked dots faint
  let total = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(L); total += L;
  }
  const lim = total * reveal;
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = segs[i - 1];
    for (let s = (6 - (d % 6)) % 6; s < L; s += 6) {
      if (d + s > lim) return;
      const k = s / L;
      const x = Math.round(x0 + (x1 - x0) * k + ox), y = Math.round(y0 + (y1 - y0) * k);
      if (state === 'open') { R(ctx, x - 1, y - 1, 4, 4, 'ink.0'); R(ctx, x, y, 2, 2, '#fff3c4'); }
      else R(ctx, x, y, 2, 2, '#4f5f86');
    }
    d += L;
  }
}

export function drawBeam(ctx, pts, ox, open, t) {
  const [x0, y0] = pts[0], [, y1] = pts[1];
  const x = x0 + ox;
  for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y++) {
    const on = open && ((y + (t >> 1)) % 8) < 4;
    R(ctx, x - 1, y, 1, 1, open ? 'cyan.2' : '#4f5f86');
    R(ctx, x + 1, y, 1, 1, open ? 'cyan.2' : '#4f5f86');
    if (on) R(ctx, x, y, 1, 1, 'white.2');
  }
}

export { line };

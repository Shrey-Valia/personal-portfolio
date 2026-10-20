// Pixel drawing helpers: Bayer dithering, banded gradients, discs,
// lines and 1-D value noise for silhouettes.

import { col } from './palette.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// vertical gradient through colour stops, dithered between bands
export function bandedGradient(ctx, x, y, w, h, stops) {
  const cs = stops.map(col);
  const bands = cs.length - 1;
  for (let py = 0; py < h; py++) {
    const t = (py / Math.max(1, h - 1)) * bands;
    const i = Math.min(bands - 1, Math.floor(t));
    const f = t - i;
    for (let px = 0; px < w; px++) {
      ctx.fillStyle = f > bayer(px, py) ? cs[i + 1] : cs[i];
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// colour at t in [0,1] along a list of stops, smoothly interpolated
export function mix(stops, t) {
  const cs = stops.map((s) => hexRgb(s[0] === '#' ? s : col(s)));
  const f = Math.max(0, Math.min(1, t)) * (cs.length - 1);
  const i = Math.min(cs.length - 2, Math.floor(f)), k = f - i;
  const a = cs[i], b = cs[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

// a clean vertical gradient, one colour per row (no dithering)
export function stripedSky(ctx, w, h, stops) {
  for (let y = 0; y < h; y++) {
    ctx.fillStyle = mix(stops, y / Math.max(1, h - 1));
    ctx.fillRect(0, y, w, 1);
  }
}

export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = col(color);
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function ring(ctx, cx, cy, r, color) {
  ctx.fillStyle = col(color);
  let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) {
      ctx.fillRect(Math.round(cx + a), Math.round(cy + b), 1, 1);
    }
    y++;
    if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}

export function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color[0] === '#' ? color : col(color);
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// smooth 1-D noise in [0,1]
export function noise1(seed) {
  const r = [];
  let s = seed >>> 0;
  for (let i = 0; i < 256; i++) { s = (s * 1664525 + 1013904223) >>> 0; r.push(s / 4294967296); }
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = r[i & 255], b = r[(i + 1) & 255];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

// smooth 2-D value noise in [0,1]
export function noise2(seed) {
  const h = (x, y) => {
    let v = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color[0] === '#' ? color : col(color);
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// a smooth rounded panel (vector, so its edges stay clean at any scale)
export function pill(ctx, x, y, w, h, fill, edge = null, r = 3) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fillStyle = fill[0] === '#' || fill.startsWith('rgb') ? fill : col(fill);
  ctx.fill();
  if (edge) { ctx.lineWidth = 0.75; ctx.strokeStyle = edge[0] === '#' || edge.startsWith('rgb') ? edge : col(edge); ctx.stroke(); }
}

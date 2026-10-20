// Sprites are authored as palette-indexed string maps and compiled to
// small canvases at boot. Artists author fills only; outline() adds the
// 1 px silhouette, flip() makes the left-facing copy.

import { col } from './palette.js';
import { makeCanvas } from '../engine/util.js';

const rgbaCache = new Map();
function rgba(hex) {
  let v = rgbaCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbaCache.set(hex, v);
  }
  return v;
}

export function rows(map) {
  return map.split('\n').map((r) => r.trim()).filter((r) => r.length);
}

export function compileMap(map, legend, name = 'sprite') {
  const rs = rows(map);
  const h = rs.length, w = Math.max(...rs.map((r) => r.length));
  rs.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: row ${i} is ${r.length} wide, expected ${w}`);
  });
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rs[y][x];
      if (ch === '.' || ch === ' ') continue;
      const ref = legend[ch];
      if (ref === undefined) throw new Error(`${name}: no colour for '${ch}'`);
      if (ref === null) continue;
      const [r, g, b] = rgba(col(ref));
      const o = (y * w + x) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// 1 px outline around every opaque pixel (4-neighbour), padded by 1
export function outline(src, color) {
  const w = src.width + 2, h = src.height + 2;
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(src, 1, 1);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = rgba(col(color));
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const mark = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) mark.push((y * w + x) * 4);
    }
  }
  for (const o of mark) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function flip(src) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// draw parts (canvas, x, y) into one canvas
export function compose(w, h, parts) {
  const [c, ctx] = makeCanvas(w, h);
  for (const p of parts) if (p) ctx.drawImage(p[0], p[1], p[2]);
  return c;
}

// a frame = canvas + flipped copy + anchor (ox, oy is where the hitbox origin sits)
export function frame(canvas, ox = 0, oy = 0) {
  return { c: canvas, f: flip(canvas), w: canvas.width, h: canvas.height, ox, oy };
}

// (x, y) is the hitbox origin; hw is the hitbox width, needed to mirror the anchor
export function drawFrame(ctx, fr, x, y, flipped, hw = 0) {
  const ax = flipped ? fr.w - fr.ox - hw : fr.ox;
  ctx.drawImage(flipped ? fr.f : fr.c, Math.round(x - ax), Math.round(y - fr.oy));
}

// convenience: compile a list of maps sharing a legend, with outline
export function sheet(maps, legend, { outlineColor = 'ink.0', ox = 0, oy = 0, name } = {}) {
  return maps.map((m, i) => {
    let c = compileMap(m, legend, (name || 'sheet') + '#' + i);
    if (outlineColor) c = outline(c, outlineColor);
    return frame(c, ox + (outlineColor ? 1 : 0), oy + (outlineColor ? 1 : 0));
  });
}

// data URL for DOM icons (HUD), drawn at native size
export function iconURL(canvas) { return canvas.toDataURL('image/png'); }

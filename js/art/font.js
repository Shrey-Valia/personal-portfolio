// In-canvas text, drawn as real type at the canvas's full device
// resolution (not as scaled-up pixels), with a dark outline so it reads
// over any background. Positions and sizes are in game pixels; text never
// renders smaller than MIN_CSS on screen, however small the window.

import { col } from './palette.js';
import { makeCanvas } from '../engine/util.js';

const FAMILY = '"Fredoka", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif';
export const TEXT = 8;              // default size, game px
const MIN_CSS = 13;                 // smallest on-screen size, CSS px

let RS = 1, CSS_PER_PX = 3;
export function setTextMetrics(renderScale, cssPerGamePx) { RS = renderScale; CSS_PER_PX = cssPerGamePx; }

const eff = (size) => Math.max(size, MIN_CSS / CSS_PER_PX);
const [, mctx] = makeCanvas(1, 1);

export function textWidth(str, size = TEXT, weight = 600) {
  mctx.font = `${weight} ${eff(size) * 20}px ${FAMILY}`;
  return mctx.measureText(String(str)).width / 20;
}

// align: left | center | right. shadow/outline: colour of the outline.
// scale multiplies the size (kept for big titles).
export function drawText(ctx, str, x, y, color = '#f5f1e6',
  { align = 'left', shadow = null, outline = null, scale = 1, size = TEXT, weight = 600 } = {}) {
  str = String(str);
  const sz = eff(size * scale);
  const px = Math.round(sz * RS);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${weight} ${px}px ${FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const dx = Math.round(x * RS), dy = Math.round(y * RS);
  const edge = outline || shadow;
  if (edge) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, px * 0.24);
    ctx.strokeStyle = edge[0] === '#' ? edge : col(edge);
    ctx.strokeText(str, dx, dy);
  }
  ctx.fillStyle = color[0] === '#' ? color : col(color);
  ctx.fillText(str, dx, dy);
  ctx.restore();
  return textWidth(str, size * scale, weight);
}

// greedy word wrap to a width in game px
export function wrap(str, maxW, size = TEXT) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (textWidth(next, size) > maxW && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// how much the on-screen floor enlarged this size (1 = not at all)
export const textGrowth = (size = TEXT) => eff(size) / size;

// line height for a given size, in game px
export const lineHeight = (size = TEXT) => Math.ceil(eff(size) * 1.25);

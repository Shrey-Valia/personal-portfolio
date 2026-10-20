// Terrain kits, one per theme. Each kit draws a tile procedurally from
// its 4-neighbour mask (1 up, 2 right, 4 down, 8 left = same terrain),
// so edges and corners come for free and never need hand-authoring.

import { col } from './palette.js';
import { bayer } from './draw.js';
import { hash2, makeCanvas } from '../engine/util.js';

export function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
export function hline(ctx, x, y, w, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, 1); }
export function vline(ctx, x, y, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, h); }

// dithered two-tone 16×16 fill, built once (the Bayer period divides 16,
// so every tile shares the same pattern)
export function ditherTile(a, b, amount) {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.fillStyle = a; ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = b;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    if (bayer(i, j) < amount) ctx.fillRect(i, j, 1, 1);
  }
  return c;
}

// ─── Oak Ridge: steel plates over concrete, teal edge light ──────────

function labKit(dark) {
  const C = {
    light: col('teal.3'), glow: col('teal.2'), plateHi: col('steel.4'), plate: col('steel.3'),
    plateLo: col('steel.2'), shadow: col('steel.1'), fill: dark ? col('indigo.0') : col('steel.1'),
    fill2: dark ? col('slate.0') : col('steel.0'), seam: col('ink.0'), rivet: col('steel.0'),
  };
  const base = ditherTile(C.fill, C.fill2, 0);
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.drawImage(base, x, y);
      // panel seams on a 2×2 tile grid
      if (tx % 2 === 0) vline(ctx, x, y, 16, C.seam);
      if (ty % 2 === 1) hline(ctx, x, y + 15, 16, C.seam);
      const h = hash2(tx, ty);
      if (h < 0.18 && (m & 1)) {           // the odd vent grille
        for (let i = 0; i < 3; i++) hline(ctx, x + 4, y + 5 + i * 2, 8, C.seam);
      }
      if (!(m & 1)) {                       // exposed top: lit steel walkway
        hline(ctx, x, y, 16, C.light);
        hline(ctx, x, y + 1, 16, C.glow);
        ctx.fillStyle = C.plate; ctx.fillRect(x, y + 2, 16, 5);
        hline(ctx, x, y + 2, 16, C.plateHi);
        hline(ctx, x, y + 7, 16, C.shadow);
        px(ctx, x + 3, y + 4, C.rivet); px(ctx, x + 12, y + 4, C.rivet);
        px(ctx, x + 3, y + 3, C.plateHi); px(ctx, x + 12, y + 3, C.plateHi);
        if (tx % 2 === 0) vline(ctx, x, y + 2, 5, C.plateLo);
      }
      if (!(m & 8)) { vline(ctx, x, y, 16, C.plateLo); if (!(m & 1)) vline(ctx, x, y, 2, C.light); }
      if (!(m & 2)) vline(ctx, x + 15, y, 16, C.seam);
      if (!(m & 4)) hline(ctx, x, y + 15, 16, C.seam);
    },
    oneway(ctx, x, y, joinL, joinR) {
      hline(ctx, x, y, 16, C.light);
      ctx.fillStyle = C.plate; ctx.fillRect(x, y + 1, 16, 3);
      hline(ctx, x, y + 1, 16, C.plateHi);
      hline(ctx, x, y + 4, 16, C.seam);
      // truss underneath
      for (let i = 0; i < 4; i++) { px(ctx, x + 2 + i, y + 5 + i, C.shadow); px(ctx, x + 13 - i, y + 5 + i, C.shadow); }
      if (!joinL) vline(ctx, x, y, 5, C.seam);
      if (!joinR) vline(ctx, x + 15, y, 5, C.seam);
    },
    animated(ctx, ch, x, y, t) {
      if (ch === '<' || ch === '>') {
        ctx.fillStyle = C.fill; ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = C.seam; ctx.fillRect(x, y, 16, 6);
        hline(ctx, x, y, 16, C.plateLo);
        const dir = ch === '>' ? 1 : -1;
        const off = ((t >> 1) * dir) & 7;
        for (let i = -1; i < 3; i++) {
          const cx = x + ((i * 8 + off) & 15);
          px(ctx, cx, y + 2, C.light); px(ctx, cx + dir, y + 3, C.light); px(ctx, cx, y + 4, C.light);
        }
        hline(ctx, x, y + 6, 16, C.shadow);
      } else if (ch === '^') {
        // arcing high-voltage coil
        ctx.fillStyle = C.fill2; ctx.fillRect(x, y + 10, 16, 6);
        for (let i = 0; i < 4; i++) vline(ctx, x + 2 + i * 4, y + 6, 4, C.plateHi);
        if ((t >> 2) % 3 !== 0) {
          const a = (t >> 2) & 3;
          for (let i = 0; i < 14; i++) px(ctx, x + 1 + i, y + 4 + ((i + a) % 3), col('cyan.3'));
        }
      }
    },
  };
}

// ─── Home: warm wooden floor ─────────────────────────────────────────

function homeKit() {
  const C = { top: col('wood.3'), plank: col('wood.2'), plankLo: col('wood.1'), dark: col('wood.0'), seam: col('ink.0') };
  return {
    terrain(ctx, x, y, m, tx, ty) {
      ctx.fillStyle = C.dark; ctx.fillRect(x, y, 16, 16);
      if (!(m & 1)) {
        hline(ctx, x, y, 16, C.top);
        ctx.fillStyle = C.plank; ctx.fillRect(x, y + 1, 16, 4);
        hline(ctx, x, y + 5, 16, C.plankLo);
        if ((tx + ty) % 3 === 0) vline(ctx, x + 7, y + 1, 4, C.plankLo);
        ctx.fillStyle = C.plankLo; ctx.fillRect(x, y + 6, 16, 4);
        hline(ctx, x, y + 10, 16, C.seam);
      }
      if (!(m & 8)) vline(ctx, x, y, 16, C.plankLo);
      if (!(m & 2)) vline(ctx, x + 15, y, 16, C.seam);
    },
    oneway(ctx, x, y, joinL, joinR) {
      hline(ctx, x, y, 16, C.top);
      ctx.fillStyle = C.plank; ctx.fillRect(x, y + 1, 16, 3);
      hline(ctx, x, y + 4, 16, C.seam);
      if (!joinL) { vline(ctx, x + 1, y + 5, 6, C.plankLo); }
      if (!joinR) { vline(ctx, x + 14, y + 5, 6, C.plankLo); }
    },
    animated() {},
  };
}

export const KITS = { lab: labKit(false), labInterior: labKit(true), home: homeKit() };

// themes add their own kits: { terrain(ctx,x,y,mask,tx,ty), oneway(ctx,x,y,joinL,joinR), animated(ctx,ch,x,y,t) }
export function registerKit(name, kit) {
  if (KITS[name]) console.error('[portfolio] kit "' + name + '" is registered twice; rename one.');
  KITS[name] = kit;
}

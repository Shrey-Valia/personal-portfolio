// A stand-in scene for a stop whose real scene isn't built yet: a sky, a
// strip of ground, the place's landmark from the island map (twice size),
// and Shrey making the standard visit. The scene builders replace these
// with the real thing; until then the site works end to end.

import { LANDMARK } from '../art/mapart.js';
import { col } from '../art/palette.js';
import { stripedSky } from '../art/draw.js';
import { makeCanvas } from '../engine/util.js';
import { visit } from './api.js';

const LM_W = 48, LM_H = 32;

export function placeholder(landmark, { sky = ['#6aa6f2', '#c8e4fd'], ground = 'grass.2', edge = 'grass.3', pose = 'idle', wave = false } = {}) {
  let mark = null;
  return {
    build() {
      const [c, ctx] = makeCanvas(LM_W, LM_H);
      LANDMARK[landmark](ctx, LM_W / 2, LM_H - 1);
      mark = c;
    },
    draw(ctx, { p, t, hero, w, h, floor, path, reduced }) {
      stripedSky(ctx, w, floor, sky);
      ctx.fillStyle = col('ink.0'); ctx.fillRect(0, floor, w, 1);
      ctx.fillStyle = col(edge); ctx.fillRect(0, floor + 1, w, 2);
      ctx.fillStyle = col(ground); ctx.fillRect(0, floor + 3, w, h - floor - 3);
      // the way out: a gap in the ground where the path drops through
      if (path.out != null) {
        ctx.fillStyle = col('ink.0'); ctx.fillRect(path.out - 6, floor, 12, h - floor);
        ctx.fillStyle = col('#fff3c4');
        for (let y = floor + 3; y < h; y += 6) ctx.fillRect(path.out - 1, y, 2, 2);
      }
      const mx = Math.round(w / 2 + 44);
      if (mark) ctx.drawImage(mark, mx - LM_W, floor - LM_H * 2 + 2, LM_W * 2, LM_H * 2);
      if (!hero) return;
      const v = visit(p, hero, Math.round(w / 2 - 30));
      let look = v.pose;
      if (v.phase === 'act') look = wave && !reduced ? 'wave.' + (t >> 4) : wave ? 'wave' : pose;
      hero.place(look, v.x, v.y, v.phase === 'act' ? 1 : v.facing);
    },
  };
}

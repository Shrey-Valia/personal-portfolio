// The stand-in every stop starts as, and falls back to if its real module
// fails: night sky in the stop's accent, a floor with a gap at the exit,
// the dotted path (cream where he's been), and a post whose light fills
// as the act phase runs, so scrubbing is visible. No text, no claims.
// It also shows the module shape a real stop fills in.

import { sky, fadeEdges, drawPath, ledge, routeDone, routePoints, FLOOR } from '../kit.js';
import { col } from '../../art/palette.js';
import { makeCanvas } from '../../engine/util.js';

// each stop's accent, from docs/TIMELINE-SCENES.md §4
const ACCENT = {
  intro: 'teal.3', vincio: 'cyan.2', ornl: 'teal.2', handshake: 'orange.2', droid: 'cyan.3',
  neu: 'red.2', dhs: 'red.2', edulearn: 'gold.3', trading: 'green.3', skills: 'wood.2', contact: 'gold.3',
};

export function placeholder(id, facts) {
  const accent = ACCENT[id] || 'teal.3';
  return {
    id,
    facts,
    placeholder: true,

    build({ w, h }) {
      const c = Math.round(w / 2);
      const [back, b] = makeCanvas(w, h);
      sky(b, w, FLOOR, ['indigo.0', 'indigo.1']);
      b.fillStyle = col('#0e1433');
      b.fillRect(0, FLOOR, w, h - FLOOR);
      ledge(b, 0, FLOOR, c + 1, 'steel');                 // the floor, with a gap at the exit
      ledge(b, c + 11, FLOOR, w - c - 11, 'steel');
      return {
        back,
        post: c + 40,
        route: { enter: [c - 6, 0], via: [[c - 6, FLOOR]], act: [c - 30, FLOOR], leave: [[c + 6, FLOOR]], exit: [c + 6, h] },
      };
    },

    draw(ctx, f, built) {
      ctx.drawImage(built.back, 0, 0);
      drawPath(ctx, routePoints(built.route), { done: routeDone(built.route, f) });
      // the post: its lamp fills from the bottom as the action runs
      const x = built.post, top = FLOOR - 30;
      ctx.fillStyle = col('ink.0'); ctx.fillRect(x - 1, top + 8, 3, 30 - 8); ctx.fillRect(x - 5, top - 1, 11, 10);
      ctx.fillStyle = col('slate.2'); ctx.fillRect(x, top + 8, 1, 22); ctx.fillRect(x - 4, top, 9, 8);
      const lit = Math.round(8 * f.act);
      ctx.fillStyle = col(accent); ctx.fillRect(x - 4, top + 8 - lit, 9, lit);
      f.drawHero();
      fadeEdges(ctx, f.w, f.h);
    },
  };
}

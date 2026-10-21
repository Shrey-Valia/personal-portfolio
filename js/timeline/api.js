// The stop runtime, shared by the page engine and tools/stop.html, so a
// builder sees exactly what the page will draw. docs/BUILDING-STOPS.md is
// the contract; this file is the engine's side of it.
//
// A stop module (js/timeline/stops/<id>.js) default-exports:
//   { id, facts, split?, key?, idle?, poses?(), build?({w,h,el}),
//     draw(ctx, f, built), hero?(f, built), labels?(f, built), transit? }
//
// p runs 0 → 1 while the stop is the active one (its dwell window). It is
// split into phases: in (the engine walks him from route.enter to
// route.act), act (the stop's action follows the scroll), hold (the
// finished result), out (the engine walks him to route.exit). Stops that
// aren't active are drawn 'before' (p 0) or 'after' (p 1), without him.

import { SCENE_H, FLOOR, STD, frameOf, drawHero, drawPath, pathLength } from './kit.js';
import { clamp, lerp } from '../engine/util.js';
import { LIST } from './stops/index.js';
import { placeholder } from './stops/_placeholder.js';

export const SPLIT = [0.15, 0.55, 0.85];
export const IDLE_FPS = 8;               // the hold-phase idle loop, at most

export function defaultRoute(w, h = SCENE_H) {
  const c = Math.round(w / 2);
  return { enter: [c, 0], via: [], act: [c, FLOOR], leave: [], exit: [c, h] };
}

// ─── walking a route (pure) ───────────────────────────────────────────

// where he is k (0–1) of the way along a polyline, and how he looks doing it.
// Mostly vertical legs are drops (jump, then fall; a crouch for the first 3 px
// after landing), steep downhill legs are slides, the rest are walks whose
// run frame comes from the distance travelled, so slow scrolling walks
// slowly and scrolling back plays it in reverse.
export function walkAlong(pts, k, { dir = 1, still = false } = {}) {
  const L = pathLength(pts);
  const target = clamp(k, 0, 1) * L;
  let d = 0, facing = dir, landed = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const drop = Math.abs(dy) > 2 * Math.abs(dx);
    if (Math.abs(dx) > 0.5) facing = (dx > 0 ? 1 : -1) * dir;
    if (target <= d + len || i === pts.length - 1) {
      const u = len > 0 ? clamp((target - d) / len, 0, 1) : 1;
      if (drop) {
        const up = dy < 0;
        const e = up ? 1 - (1 - u) * (1 - u) : u * u;       // gravity either way
        const rising = (dir > 0) === up;                     // moving upward on screen
        return { x: x0 + dx * u, y: y0 + dy * e, pose: rising || u < 0.12 ? 'jump' : 'fall', frame: 0, facing };
      }
      const x = lerp(x0, x1, u), y = lerp(y0, y1, u);
      const into = target - d;
      if (landed <= 0 && into < 3) return { x, y, pose: 'crouch', frame: 0, facing };
      if (dy > 0.6 * Math.abs(dx)) return { x, y, pose: 'slide', frame: 0, facing };
      return { x, y, pose: still ? 'idle' : 'run', frame: Math.floor(target / 5) % 4, facing };
    }
    landed = drop && dy > 0 ? 0 : Infinity;
    d += len;
  }
  const [x, y] = pts[pts.length - 1];
  return { x, y, pose: 'idle', frame: 0, facing };
}

// ─── one stop ─────────────────────────────────────────────────────────

const REQUIRED = ['draw'];

// wrap a stop module so the engine and the bench drive it the same way
export function runtime(mod) {
  for (const k of REQUIRED) if (typeof mod[k] !== 'function') throw new Error(`stop "${mod.id}" has no ${k}()`);
  const split = mod.split || SPLIT;
  let local = null;
  const rt = {
    mod, id: mod.id, facts: mod.facts || [], split,
    get idle() { return !!mod.idle; },
    get poses() { return local || (local = mod.poses ? mod.poses() || {} : {}); },

    build({ w, h = SCENE_H, el = null }) {
      const b = (mod.build ? mod.build({ w, h, el }) : null) || {};
      b.route = Object.assign(defaultRoute(w, h), b.route || {});
      b.route.via = b.route.via || [];
      b.route.leave = b.route.leave || [];
      b.w = w; b.h = h;
      return b;
    },

    // the state a stop draws from. active: it's the stop he's at (or, with
    // reduced motion, the current one). t: the idle clock in ms (hold only).
    // end: this stop is where the path ends (the last one): he never walks
    // out, so from the start of `out` on it is the finished hold (hold 1).
    frame({ p = 0, active = true, reduced = false, t = 0, dir = 1, still = false, end = false, w, h = SCENE_H }) {
      const [a, b, c] = split;
      if (reduced) p = mod.key != null ? mod.key : (b + c) / 2;
      let phase;
      if (!active && !reduced && p <= 0) phase = 'before';
      else if (!active && !reduced && p >= 1 && !end) phase = 'after';
      else phase = p < a ? 'in' : p < b ? 'act' : p < c || end ? 'hold' : 'out';
      const act = phase === 'before' ? 0 : phase === 'after' ? 1 : clamp((p - a) / (b - a), 0, 1);
      const hold = phase === 'before' ? 0 : phase === 'after' ? 1 : clamp((p - b) / (c - b), 0, 1);
      const walk = phase === 'in' ? p / a : phase === 'out' ? (p - c) / (1 - c) : phase === 'before' ? 0 : 1;
      return {
        p, phase, act, hold, walk, w, h, dir, reduced,
        here: !!active,
        t: !reduced && phase === 'hold' && mod.idle ? t : 0,
        still, drawHero: () => {},
      };
    },

    // where he is in this scene, or null when he isn't here
    place(f, built) {
      if (!f.here) return null;
      const r = built.route;
      const opts = { dir: f.dir, still: f.still };
      if (f.phase === 'in') return walkAlong([r.enter, ...r.via, r.act], f.walk, opts);
      if (f.phase === 'out') return walkAlong([r.act, ...r.leave, r.exit], f.walk, opts);
      const h = mod.hero ? mod.hero(f, built) : null;
      return {
        pose: (h && h.pose) || 'idle',
        frame: (h && h.frame) || 0,
        x: h && h.x != null ? h.x : r.act[0],
        y: h && h.y != null ? h.y : r.act[1],
        facing: (h && h.facing) || 1,
      };
    },

    // draw the scene into ctx (backed at w×h game px). Returns where the hero
    // is (inside: drawn in the scene; otherwise the engine shows him on the
    // track layer at the same spot) and the scene's HTML labels.
    render(ctx, built, f) {
      const { w, h } = built;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      const hero = rt.place(f, built);
      let fr = null, inside = false, drawn = false;
      if (hero) {
        fr = frameOf(hero.pose, hero.frame, rt.poses);
        inside = fits(fr, hero, w, h);
      }
      f.drawHero = () => { if (hero && inside && !drawn) { drawHero(ctx, fr, hero.x, hero.y, hero.facing); drawn = true; } };
      mod.draw(ctx, f, built);
      f.drawHero();                       // on top, if the stop didn't place him
      const labels = mod.labels ? (mod.labels(f, built) || []) : [];
      return { hero: hero ? { ...hero, fr, inside } : null, labels };
    },
  };
  return rt;
}

// is his whole frame inside the scene? (then the scene draws him, layered)
export function heroBox(fr, hero) {
  const ax = hero.facing < 0 ? fr.w - fr.ox - 10 : fr.ox;
  return { x: Math.round(hero.x - 5 - ax), y: Math.round(hero.y - 20 - fr.oy), w: fr.w, h: fr.h };
}
function fits(fr, hero, w, h) {
  const b = heroBox(fr, hero);
  return b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h;
}

// ─── the move to the next stop ────────────────────────────────────────

// the default connector: switchbacks down the lane on desktop, nearly
// straight on phones (it runs under the card there), with a small ledge at
// each turn. A stop's `transit` replaces it for the gap below that stop.
export const defaultTransit = {
  build({ w, h, from, to, side = 0, lane = 0 }) {
    // wide on the side the card isn't on, within the lane on the side it is
    const near = Math.max(6, lane - 6), wide = side ? Math.min(w / 2 - 10, 28) : near;
    const turns = Math.max(1, Math.round(h / 48));
    const pts = [from];
    for (let k = 1; k <= turns; k++) {
      const t = k / (turns + 1);
      const free = k % 2 ? -1 : 1;                          // first swing towards the free side
      const x = side ? w / 2 + (free === -side ? wide * free : near * free) : w / 2 + near * free;
      pts.push([Math.round(x), Math.round(lerp(from[1], to[1], t))]);
    }
    pts.push(to);
    return { pts, len: pathLength(pts) };
  },
  draw(ctx, g, built) {
    // landings at the turns, then the dots, cream up to where he's got to
    for (let i = 1; i < built.pts.length - 1; i++) {
      const [x, y] = built.pts[i];
      ctx.fillStyle = '#0b0d17'; ctx.fillRect(x - 5, y + 1, 10, 3);
      ctx.fillStyle = '#566685'; ctx.fillRect(x - 4, y + 1, 8, 2);
    }
    drawPath(ctx, built.pts, g.reduced ? Infinity : g.s * built.len);
  },
  hero(g, built) { return walkAlong(built.pts, g.s, { dir: g.dir, still: g.still }); },
};

// wrap a transit ({ build, draw, hero }) like runtime() wraps a stop
export function transitRuntime(tr = defaultTransit) {
  return {
    tr,
    build({ w, h, from = [Math.round(w / 2), 0], to = [Math.round(w / 2), h], side = 0 }) {
      const b = tr.build({ w, h, dy: h, from, to, side }) || {};
      b.w = w; b.h = h; b.from = from; b.to = to;
      return b;
    },
    // g: { s 0–1 along the move, dir, reduced, still }
    render(ctx, built, g) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, built.w, built.h);
      ctx.imageSmoothingEnabled = false;
      tr.draw(ctx, g, built);
      const h = g.here === false ? null : tr.hero(g, built);
      return h ? { pose: h.pose || 'idle', frame: h.frame || 0, x: h.x, y: h.y, facing: h.facing || 1 } : null;
    },
  };
}

// ─── loading ──────────────────────────────────────────────────────────

// a stop that fails to load, or isn't shaped right, becomes its placeholder
export async function loadStop(id) {
  const entry = LIST.find((s) => s.id === id);
  if (!entry) throw new Error(`[timeline] no stop "${id}" in the list`);
  try {
    const mod = (await entry.load()).default;
    if (!mod || mod.id !== id) throw new Error(`its default export has id "${mod && mod.id}"`);
    return runtime(mod);
  } catch (err) {
    console.error(`[timeline] stop "${id}" failed; using its placeholder.`, err);
    return runtime(placeholder(id, entry.facts));
  }
}

// draw, falling back to the placeholder (once) if the stop throws
export function safeRender(rt, ctx, built, f, onFail) {
  try { return rt.render(ctx, built, f); } catch (err) {
    console.error(`[timeline] stop "${rt.id}" failed while drawing; using its placeholder.`, err);
    if (onFail) onFail(err);
    return null;
  }
}

// ─── HTML labels over a scene ─────────────────────────────────────────

// labels: [{ text, x, y, tone, align }], x/y in game px (the label's top,
// centred on x unless align is 'left' or 'right'). gp: CSS px per game px.
export function placeLabels(layer, labels, gp) {
  const have = layer.children;
  labels.forEach((l, i) => {
    let s = have[i];
    if (!s) { s = document.createElement('span'); layer.appendChild(s); }
    const align = l.align || 'center';
    if (s.textContent !== l.text) s.textContent = l.text;
    s.className = `tl-label tl-label--${l.tone || 'plain'} tl-label--${align}`;
    s.style.left = (l.x * gp) + 'px';
    s.style.top = (l.y * gp) + 'px';
  });
  while (have.length > labels.length) layer.lastChild.remove();
}

export { STD };

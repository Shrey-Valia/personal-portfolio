// The stop plug-in API for the scroll timeline (docs/BUILDING-STOPS.md is
// the contract). A stop is one place on the path: a scene box the canvas
// draws into, and a card of résumé text under it. Each one lives in
// js/site/stops/<id>.js, calls registerStop(), and is imported by
// js/site/stops/index.js. The engine (timeline.js) owns layout, scroll,
// the path and the hero between stops; a stop only draws its own scene.

import { drawFrame } from '../art/sprite.js';
import { buildHero } from '../art/sprites/hero.js';
import { clamp, lerp } from '../engine/util.js';

// scene sizes, in art pixels (one art pixel is a whole number of device pixels)
export const DESIGN_W = 320;     // what every scene is designed at
export const SAFE_W = 288;       // keep what matters inside this, centred: phones can be this narrow
export const MAX_W = 400;        // the widest a box gets; backgrounds should fill any w up to this

const DEFAULTS = {
  size: [DESIGN_W, 160],         // [w, h]: design width, fixed height
  factIds: [],                   // the facts this stop's card holds (checked in ?debug=1)
  keyPose: 0.5,                  // the p shown under reduced motion (and the hero's pose there)
  leave: 'walk',                 // how he travels to the next stop: walk | hop | slide | climb
  loop: false,                   // true: draw() animates with t while on screen
  chips: [],                     // highlight chips under the card's lead line (text from the card)
  enter: true,                   // false: he starts inside this scene (the intro)
  exit: true,                    // false: he stays here at the end (the last stop)
};

export const STOPS = [];
const byId = new Map();

export function registerStop(def) {
  if (!def || typeof def.id !== 'string' || !def.id) {
    console.error('[timeline] registerStop() needs a string id', def);
    return null;
  }
  if (byId.has(def.id)) {
    console.error(`[timeline] stop "${def.id}" is registered twice; every stop id must be unique. The second one is ignored.`);
    return null;
  }
  if (typeof def.draw !== 'function') {
    console.error(`[timeline] stop "${def.id}" has no draw(ctx, state)`);
    return null;
  }
  if (typeof def.order !== 'number') console.error(`[timeline] stop "${def.id}" needs a numeric order`);
  const stop = Object.assign({}, DEFAULTS, def);
  byId.set(stop.id, stop);
  STOPS.push(stop);
  STOPS.sort((a, b) => a.order - b.order);
  return stop;
}

export const getStop = (id) => byId.get(id) || null;

// ─── the hero ─────────────────────────────────────────────────────────

let HERO = null;
export function setHeroArt(frames) { HERO = frames; }
const heroArt = () => HERO || (HERO = buildHero());

// pose: a frame list from buildHero() ('idle', 'run', 'wave', 'typing',
// 'sit', 'climb', ...), optionally with a frame number: 'run.2', 'wave.1'
export function heroFrame(pose) {
  const art = heroArt();
  const [name, n] = String(pose || 'idle').split('.');
  const list = art[name] || art.idle;
  const i = Math.floor(+n || 0);
  return list[((i % list.length) + list.length) % list.length];
}

// (x, y) is where his feet meet the ground, centred under him; facing 1 is
// right, -1 is left. He is about 18 wide and 26 tall (20 wide when an arm
// reaches out in front).
export function drawHero(ctx, pose, x, y, facing = 1) {
  drawFrame(ctx, heroFrame(pose), x - 5, y - 20, facing < 0, 10);
}
export const HERO_H = 26;

// ─── helpers for scenes ───────────────────────────────────────────────

// p inside a window: 0 before a, 1 after b, linear between
export const span = (p, a, b) => clamp((p - a) / Math.max(1e-6, b - a), 0, 1);

// the standard visit: hop down from the entry onto the floor, walk to
// spotX, act there, walk to the exit and drop out through the bottom.
// Returns where he is at p: { x, y, pose, facing, phase, k }, where k runs
// 0→1 through the act phase (phase 'act'); scenes pick his pose there.
// opts: arrive/depart (the act window in p), enter/exit false to start or
// end inside the scene, floor (y of the ground), face (facing while acting).
export function visit(p, hero, spotX, opts = {}) {
  const enter = opts.enter !== undefined ? opts.enter : hero.enters;
  const exit = opts.exit !== undefined ? opts.exit : hero.exits;
  const { arrive = enter ? 0.3 : 0, depart = exit ? 0.75 : 1, floor = hero.floor, face = 1 } = opts;
  const [ex, ey] = hero.in, [xx, xy] = hero.out;
  const dir = hero.dir || 1;
  const walk = (from, to, k) => {
    const x = lerp(from, to, k);
    const moving = Math.abs(to - from) > 1 && k > 0 && k < 1;
    const facing = (to >= from ? 1 : -1) * dir;
    return { x, pose: moving ? 'run.' + Math.floor(Math.abs(x - from) / 5) : 'idle', facing };
  };
  const hop = 0.14, drop = 0.92;

  if (enter && p < hop) {                                   // hop down onto the floor
    const k = p / hop;
    return { x: ex, y: lerp(ey, floor, k * k) - Math.sin(k * Math.PI) * 10, pose: k < 0.4 ? 'jump' : 'fall', facing: dir, phase: 'enter', k };
  }
  if (p < arrive) {
    const k = enter ? span(p, hop, arrive) : 1;
    return { ...walk(ex, spotX, enter ? k : 1), y: floor, phase: 'enter', k };
  }
  if (p <= depart || !exit) {
    return { x: spotX, y: floor, pose: 'idle', facing: face, phase: 'act', k: span(p, arrive, depart) };
  }
  if (p < drop) {
    const k = span(p, depart, drop);
    return { ...walk(spotX, xx, k), y: floor, phase: 'leave', k };
  }
  const k = span(p, drop, 1);                               // drop out of the bottom
  return { x: xx, y: lerp(floor, xy, k * k), pose: 'fall', facing: dir, phase: 'leave', k };
}

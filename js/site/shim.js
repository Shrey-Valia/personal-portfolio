// A stand-in level, so the game's set pieces (js/game/setpieces.js and the
// ones the js/themes/*.js files register) can be built and drawn inside a
// timeline scene. It has what set pieces read: platforms, enemies,
// objects, state.built, game.progress, game.content, a hero stub, a
// camera whose shake does nothing, and no-op sound, particles, toasts and
// UI (anything else a piece calls on game is a no-op too). A piece's
// finish() is disabled: in a level it ends the level.
//
//   const lv = createLevelShim({ w, h });
//   const bar = lv.add('runbar', 2, 6, { len: 6, fact: 'x-ornl-2' });
//   bar.fill = k;                      // set state from p, deterministically
//   lv.drawAll(ctx, t);                // back() then draw() for every piece
//
// Pieces are positioned in tiles (16 px) and drawn minus lv.camera, so
// move the camera to frame them. Nothing here touches the real game.

import { TILE } from '../config.js';
import { SETPIECES } from '../game/setpieces.js';
import { TileMap, parseRows } from '../engine/tilemap.js';
import { KITS } from '../art/tiles.js';
import { makeCanvas } from '../engine/util.js';

let ENV = { content: null, art: null };
export function setShimEnv(env) { ENV = env; }

const noop = () => {};
// anything a piece asks for that isn't spelled out below is a callable no-op
const stub = () => new Proxy(function () {}, {
  get: (t, k) => (k === 'then' || typeof k === 'symbol' ? undefined : stub()),
  apply: () => undefined,
});
const soft = (obj) => new Proxy(obj, {
  get: (t, k) => (k in t || k === 'then' || typeof k === 'symbol' ? t[k] : stub()),
});

// opts:
//   w, h     scene size in art px (the map is that many tiles, empty)
//   rows     ASCII tile rows instead ('#' ground, '=' one-way), drawn with
//   kit      a registered tile kit ('vincio', 'handshake', 'neu', ...); lv.map.draw()
//   found    which facts count as logged: 'all' (default) or a list of ids
//   skills   which skills count as collected: 'all' (default) or a list
//   reduced  passed through as game.reduced
export function createLevelShim(opts = {}) {
  const { w = 320, h = 160, rows = null, kit = null, found = 'all', skills = 'all', reduced = false } = opts;
  const facts = found === 'all' ? null : new Set(found);
  const have = skills === 'all' ? null : new Set(skills);
  const content = ENV.content;
  const cols = Math.ceil(w / TILE), nrows = Math.ceil(h / TILE);
  const map = new TileMap(rows || new Array(nrows).fill('.'.repeat(cols)), KITS[kit] || KITS.lab);
  if (rows) map.prerender();

  const lv = {
    W: w,
    t: 0,
    freeze: 0,
    map,
    def: { id: 'timeline', node: opts.node || 'timeline', rooms: {} },
    room: { facts: {}, map: rows || [] },
    roomId: 'scene',
    state: { used: new Set(), built: new Set(), bits: new Set(), flags: new Set() },
    stats: { bits: 0, bugs: 0, start: 0 },
    platforms: [], enemies: [], objects: [], setpieces: [], floaters: [], ports: [],
    blocks: new Map(),
    checkpoint: null,
    // stands off to the left, out of every trigger zone, unless you move it
    hero: {
      x: -999, y: 0, w: 10, h: 20, vx: 0, vy: 0, prevX: -999, prevY: 0, facing: 1,
      state: 'normal', coffee: false, iframes: 0, grounded: true, ground: null,
      setState(s) { this.state = s; },
      place(x, y) { this.x = this.prevX = x; this.y = this.prevY = y; },
    },
    camera: { x: 0, y: 0, prevX: 0, prevY: 0, shake: noop, shakeOn: false },
    get camX() { return this.camera.x; },
    game: soft({
      reduced,
      W: w,
      art: ENV.art,
      content: content || { get: () => null, facts: new Map(), skills: [], credits: [], total: 0 },
      progress: soft({
        facts: facts || new Set(content ? content.facts.keys() : []),
        skills: have || new Set(content ? content.skills.map((s) => s.name) : []),
        hasFact: (id) => !facts || facts.has(id),
        hasSkill: (name) => !have || have.has(name),
        addFact: noop, addSkill: noop, addBits: () => false, stat: noop,
        settings: { muted: true, assist: false }, stats: { bugs: 0, deaths: 0 },
      }),
      particles: stub(),
      audio: stub(),
      input: stub(),
      ui: stub(),
    }),

    sfx: noop,
    dust: noop,
    after(n, fn) { timers.push({ n, fn }); },
    discover: () => false,
    hurtHero: noop, drinkCoffee: noop, collectBit: noop, reachGoal: noop, checkpointReached: noop,
    bugFixed: noop, nearSign: noop, bumpAbove: noop, onHeadHit: noop,
    spawn(o) { this.objects.push(o); },
    addBlock(b) { this.blocks.set(b.tx + ',' + b.ty, b); },

    // build a registered set piece at tile (tx, ty); returns it
    add(type, tx, ty, spec = {}) {
      const Ctor = SETPIECES[type];
      if (!Ctor) throw new Error(`[timeline] no set piece "${type}" (is its theme file imported?)`);
      const sp = new Ctor(tx, ty, { type, ...spec }, lv, 'scene:' + tx + ',' + ty);
      if (typeof sp.finish === 'function') sp.finish = noop;     // ends the level (the beacon opens the end screen)
      lv.setpieces.push(sp);
      for (const b of lv.blocks.values()) if (b.init && !b.inited) { b.init(lv); b.inited = true; }
      return sp;
    },

    // run n game steps (1/60 s each): timers, then every piece's update()
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        lv.t++;
        for (let j = timers.length - 1; j >= 0; j--) if (--timers[j].n <= 0) timers.splice(j, 1)[0].fn();
        for (const sp of lv.setpieces) if (sp.update) sp.update(lv);
        for (const e of lv.enemies) if (e.alive !== false && e.update) e.update(lv);
      }
    },

    // every piece's back(), then the enemies and objects, then every draw()
    drawAll(ctx, t = lv.t) {
      const cam = lv.camera;
      for (const sp of lv.setpieces) if (sp.back) sp.back(ctx, cam, t);
      for (const o of lv.objects) if (o.draw) o.draw(ctx, cam, t, ENV.art, lv);
      for (const e of lv.enemies) if (e.alive !== false && e.draw) e.draw(ctx, cam, t, ENV.art, lv, 1);
      for (const sp of lv.setpieces) if (sp.draw) sp.draw(ctx, cam, t);
    },
  };
  const timers = [];
  return lv;
}

// ?debug=1: build every set piece any level places, through the shim, with
// its level's own spec and room; step it with Shrey far away, then beside
// it; draw it. Whatever throws is a gap in the shim (or a piece that needs
// a real level), reported by type.
export function shimSelfTest(levels) {
  const TERRAIN = new Set(['#', '=', '^', '<', '>', '.']);
  const [, ctx] = makeCanvas(480, 216);
  const types = new Set(), bad = [];
  let built = 0;
  const run = (what, fn) => { try { fn(); return true; } catch (err) { bad.push(`${what}: ${err.message}`); return false; } };
  for (const def of Object.values(levels)) {
    for (const [rid, R] of Object.entries(def.rooms)) {
      if (!R.marks) continue;
      const src = parseRows(R.map);
      const rows = src.map((r) => [...r].map((ch) => (TERRAIN.has(ch) ? ch : '.')).join(''));
      const lv = createLevelShim({ rows, kit: R.kit || def.kit, w: rows[0].length * TILE, h: rows.length * TILE });
      lv.def = def; lv.room = R; lv.roomId = rid;
      ctx.W = 480;
      const pieces = [];
      src.forEach((row, y) => [...row].forEach((ch, x) => {
        const spec = R.marks[ch];
        if (!spec || TERRAIN.has(ch)) return;
        const where = `${def.id}:${rid} ${spec.type}`;
        if (run(where + ' (build)', () => pieces.push([where, lv.add(spec.type, x, y, spec), x, y]))) { types.add(spec.type); built++; }
      }));
      for (const [where, sp, x, y] of pieces) {
        run(where + ' (update)', () => {
          for (let i = 0; i < 3; i++) if (sp.update) sp.update(lv);
          Object.assign(lv.hero, { x: x * TILE, y: y * TILE - 4, prevX: x * TILE, prevY: y * TILE - 4 });
          for (let i = 0; i < 40; i++) { lv.t++; if (sp.update) sp.update(lv); }
          lv.hero.x = lv.hero.prevX = -999;
        });
        run(where + ' (draw)', () => {
          lv.camera.x = Math.max(0, x * TILE - 200); lv.camera.y = 0;
          if (sp.back) sp.back(ctx, lv.camera, lv.t);
          if (sp.draw) sp.draw(ctx, lv.camera, lv.t);
        });
      }
      run(`${def.id}:${rid} (step + drawAll)`, () => { lv.step(5); lv.drawAll(ctx); });
    }
  }
  return { built, types: [...types].sort(), bad };
}

# Building a level

Each map node gets one level. A level is two files you own outright:

```
js/game/levels/<node>.js     rooms (ASCII), facts, ports, marks: pure data
js/themes/<node>.js          art + mechanics: tiles, backdrop, set pieces, enemies, music
```

Register the level with **one import and one entry** in
`js/game/levels/index.js`. That is the only shared file a level touches.
The map node lights up and becomes enterable automatically.

## Ground rules

- **Content comes from `index.html`.** Every fact is a `data-fact="id"`
  element. Levels hand out fact ids; never write résumé text into a level.
  Run `?debug=1` and the console coverage line must show your ids as homed and
  **0 dangling**.
- **Every fact is on the main path.** Nobody should miss content because a
  jump was hard. Signs (`S`) auto-open when touched; blocks (`F`) open on hit.
- **Depict the work.** The level's signature mechanic must show what the
  résumé bullet is about. In Oak Ridge, monomers self-assemble into bridges
  (GNNs for self-assembly), a RUN progress bar becomes a bridge (the web
  tool), and design-input sliders rise from target properties (inverse
  model). Generic decoration is a failure; Shrey reads visuals as claims.
- **Original art only.** No `?` blocks, green pipes, mushrooms, stars,
  flagpoles, castles, Goomba/Koopa shapes, Nintendo-like music or company
  logos (company names as text are fine). Enemies are software bugs.
- **Fair.** Main-path gaps ≤ 2 tiles. Pits are the only instant death, and
  their far edge must be on screen. No enemy within 5 tiles of a fact block,
  checkpoint or port exit. 1 checkpoint per short level, 2 per long one,
  and one before the first pit. At most one signature mechanic and two enemy
  types per level (Oak Ridge, the flagship, is the one exception). A side
  room reached by port is a one-screen "reading room": no enemies, no pits,
  `camera: 'fixed'`, at most 30 columns, with everything that matters in
  the middle 24 (screens show 384–480 px).
- **Unique names.** Registries are global. Prefix everything you register
  with your node: set pieces `'trading.candles'`, kits/backdrops/songs/skins
  `'trading'`. Duplicate or reserved names log an error. Enemy chars `z`
  (Label Factory) and `y` (Trading) are taken.
- **Readable.** Canvas text goes through `drawText()` (real type with an
  outline). Use sentence case. Keep labels short.
- **Length.** 50–110 seconds for a first-time player.

## Level file

```js
import { joinSegments } from '../../engine/tilemap.js';
import '../../themes/vincio.js';            // registers this level's art + mechanics

export default {
  id: 'vincio', node: 'vincio',             // node must exist in js/game/map.js
  title: 'Vincio Studio', sub: 'AI video editor · Jan–Aug 2026',
  theme: 'studio', kit: 'studio', skin: 'studio', music: 'studio',
  goal: 'Export',                           // SHIP-IT button label
  start: 'main',
  rooms: {
    main: {
      map: joinSegments([SEG_A, SEG_B]),    // 14 rows; segments glued left to right
      facts: { S: ['p-vincio'], F: ['p-vincio-1', 'p-vincio-2'] },   // assigned left → right
      duck: ['One short hint.'],
      ports: [{ to: 'backstage', exit: 0 }],  // one per P, left → right
      marks: { 1: { type: 'clipBridge', len: 6 } },
      camera: 'follow',                     // or 'fixed' (one screen) or 'vertical'
    },
    backstage: { kit: 'studioDark', theme: 'studioDark', camera: 'fixed', safe: true, /* … */ },
  },
};
```

### Map characters (16 px tiles, 14 rows; row 13 is the bottom)

| char | meaning | char | meaning |
|---|---|---|---|
| `.` | empty | `#` | terrain (autotiled by your kit) |
| `=` | one-way platform | `^` | hazard (damages) |
| `<` `>` | conveyor | `@` | hero spawn |
| `F` | info block (fact) | `K` | coffee block (shield) |
| `S` | sign (fact, auto-opens) | `N` | debug duck (hint text) |
| `c` | bit (coin) | `C` | checkpoint (commit flag) |
| `G` | goal (SHIP-IT button) | `P` | port: top-left of a 2-wide conduit, depth runs to the ground |
| `e` | walker bug | `h` | hopper |
| `1`–`9`, other letters | set piece from `marks`, or an enemy you registered |

Reserved (never register these as enemies): `. # = ^ < > @ F K c C G S N P` and digits.

The hero is 10×20. Ground top at row 11 means the hero stands at y = 156.
A block 4 rows above the ground (row 7) is a comfortable bump. A walking jump
is about 3.75 tiles; running about 4.7. The HUD covers the top 16 px of the
screen, so keep anything important below row 1.

## Theme file

```js
import { registerKit, hline, vline } from '../art/tiles.js';
import { registerBackground, strip, blitStrip } from '../art/backgrounds.js';
import { registerSkin, registerActorSprites } from '../art/sprites/actors.js';
import { registerSetpiece, platform } from '../game/setpieces.js';
import { registerEnemy, Enemy } from '../game/enemies.js';
import { registerSong, steps } from '../engine/audio.js';

registerKit('studio', { terrain(ctx, x, y, mask, tx, ty) {}, oneway(ctx, x, y, joinL, joinR) {}, animated() {} });
registerBackground('studio', (W) => ({ draw(ctx, camX, camY, t, reduced) {} }));
registerSkin('studio', { d: 'indigo.1', b: 'indigo.2', c: 'indigo.3', t: 'gold.3', e: 'white.2', o: 'ink.0', l: 'slate.3' });
registerSetpiece('clipBridge', class { constructor(tx, ty, spec, level, key) {} update(level) {} draw(ctx, cam, t) {} onFact(id, level) {} });
registerSong('studio', { bpm: 120, lead: steps('C5 . E5 …'), bass: steps('C3 …'), drums: steps('k . h . s . h .') });
```

- **Kits** draw a 16×16 tile from its 4-neighbour mask (1 up, 2 right, 4
  down, 8 left = same terrain), so edges come free. See `js/art/tiles.js`.
- **Backdrops** are prerendered strips blitted with parallax; see
  `labDawn` in `js/art/backgrounds.js`. Smooth gradients
  (`stripedSky`), no dithering. When `reduced` is true, set parallax to 0.
- **Set pieces** can add moving platforms (`level.platforms.push(platform(…))`,
  update `prevX/prevY` before moving), add blocks (`level.addBlock(obj)`
  with the `InfoBlock` interface), react to facts (`onFact`), read
  `level.hero`, and draw behind (`back`) or in front (`draw`) of the tiles.
  Persist "already built" state in `level.state.built` (keyed by `key`).
- **Enemies** extend `Enemy` (see `Walker`/`Hopper` in `js/game/enemies.js`)
  and register a map character.
- **Colours** come from the palette ramps in `js/art/palette.js`
  (`'teal.2'` etc.). Sprites are palette-indexed string maps compiled with
  `sheet()` from `js/art/sprite.js`.

## Testing

```bash
python3 tools/serve.py 4173        # no-cache dev server; pick your own port
```

- `?debug=1&fresh=1&level=<node>`: boot straight into your level with
  clean progress (fresh runs never write to the real save).
- `?god=1`: no damage.
- With `?debug=1`, entering a level runs a data check (block/sign/duck/port
  counts vs their lists, fact ids, kits, backdrops, songs, port exits) and
  prints `level check: <id> OK` or each problem.
- With `?debug=1`, `window.__game` is exposed. Background tabs don't run
  `requestAnimationFrame`, so step frames by hand:
  `for (let i = 0; i < 60; i++) __game.update(); __game.render(1);`
  Hold keys with `__game.input.down('right')` / `.up('right')`.
- Before you finish, play the level start to finish, collect every fact, die
  once in a pit and once to an enemy, and check 0 console errors.

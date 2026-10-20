# Building a stop

The website is a scroll timeline, newest first. Each stop is a **scene box**
(pixel art the canvas draws) above a **card** (the résumé's own HTML, moved
in). As you scroll, Shrey walks the path down the page; when the reading line
(40 % of the way down the viewport) enters a scene, that scene's action
plays with the scroll, and runs backwards when you scroll up.

The engine (`js/site/timeline.js`) owns the layout, the scroll, the path
between stops and Shrey on it. **A stop only draws its own scene.**

## Files

```
js/site/stops/<id>.js     your stop: you own it outright
js/themes/<id>.js         the level's theme: you may add `export` to pure helpers, nothing else
```

`js/site/stops/index.js` already imports every stop; don't touch it, the
engine, or anyone else's stop. If you need a pose that `js/art/sprites/hero.js`
doesn't have, ask for it in the shared notes rather than editing that file.

## The stop

Each file calls `registerStop()` once. The fields come in two groups.

**The card (content: leave these alone)**

| field | what it is |
|---|---|
| `id`, `order` | unique id; position on the timeline (lower is higher up) |
| `node` | a selector for the résumé element(s) moved into the card, or a function returning built nodes |
| `factIds` | the facts the card holds (checked in `?debug=1`) |
| `kind`, `when`, `nav`, `lead`, `chips`, `head`, `layout`, `places`, `anchor` | the card's label, date, bar link, lead line, highlight chips, heading, bookend layout, game place ids, link target |

**The scene (yours)**

| field | default | what it is |
|---|---|---|
| `build(art)` | — | called once before first use; prebuild canvases here (`art` is the game's art: `art.hero`, `art.items`, `art.actors`, `art.mapBase`) |
| `draw(ctx, state)` | required | draws the scene; see below |
| `size` | `[320, 160]` | design size in art pixels; height is fixed |
| `keyPose` | `0.5` | the `p` shown with reduced motion (and for deep links) |
| `leave` | `'walk'` | the move to the next stop: `walk`, `hop`, `slide`, `climb` |
| `loop` | `false` | frames per second for an idle animation (`true` = 30), only while on screen |
| `enter`, `exit` | `true` | `false` when he starts or ends inside this scene (the intro, the last stop) |

## `draw(ctx, state)`

The context is already set up the game's way: `ctx.setTransform(rs, …)` is
applied, so you draw in **art pixels** from the scene's top-left, `ctx.W` is
the scene width, and image smoothing is off. Fill the whole box every time
(it is cleared first).

`state`:

| key | |
|---|---|
| `p` | 0 → 1 as the reading line crosses the box top → bottom. Scenes above the reading line are drawn at 1 (done), scenes below it at 0 (not started). |
| `t` | time in 60 fps frames, **0 unless `loop` is set** |
| `w`, `h` | the box in art px. `h` is your `size[1]`; `w` runs from 288 (narrow phones) to `size[0] × 1.25` (max 400) |
| `floor` | the default ground line, `h − 18` |
| `path` | `{ in, out }`: x where the path enters the top and leaves the bottom (`null` when it doesn't). Leave an opening there; on phones it is near the left edge, on desktop near the centre. |
| `hero` | `null` unless Shrey is in this scene; otherwise see below |
| `reduced` | the visitor prefers reduced motion |

**Rules for `draw`:** it is a pure function of `p` (and `t` when looping):
no `Math.random()`, no `Date`, no state carried from the last frame, no DOM.
That is what makes scrolling back up play the action backwards. Keep it
under about 2 ms (build static layers once in `build()` and `drawImage` them).
Critical content stays inside the **central 288 px**; backgrounds fill all of `w`.

### Placing Shrey

When `hero` isn't null he's yours to place. Call
`hero.place(pose, x, y, facing)` and the engine draws him on top of the
scene, unclipped, so he can step in through the top edge and drop out of
the bottom. (x, y) is where his feet meet the ground. If something in the
scene must be in front of him (a desk, a podium rail), draw him yourself
with `drawHero(ctx, pose, x, y, facing)` and don't call `place`.

`hero` has `in` and `out` (the [x, y] where the path meets your box),
`floor`, `enters`/`exits`, `dir` (`-1` while scrolling up) and `moving`.

The standard visit does the boring part: hop down from `in`, walk to a
spot, act, walk to `out`, drop out of the bottom.

```js
import { registerStop, visit, span, drawHero } from '../api.js';

draw(ctx, { p, hero, w, h, floor }) {
  // … the scene at p …
  if (!hero) return;
  const v = visit(p, hero, 120, { arrive: 0.25, depart: 0.8 });
  // v.phase is 'enter' | 'act' | 'leave'; v.k runs 0 → 1 through 'act'
  const pose = v.phase === 'act' ? (v.k < 0.5 ? 'typing.' + Math.floor(v.k * 12) : 'point') : v.pose;
  hero.place(pose, v.x, v.y, v.phase === 'act' ? 1 : v.facing);
}
```

`span(p, a, b)` maps `p` to 0 → 1 over a window, for staging beats.

**Poses** (`'name'` or `'name.frame'`): `idle`, `blink`, `run` (4), `jump`,
`fall`, `skid`, `crouch`, `hurt`, `victory`, plus for scenes `wave` (2),
`point`, `typing` (2), `hold`, `lift` (hands overhead), `sit`, `sitTyping`
(2), `climb` (2, back view), `slide`, `cheer`. He is about 18 × 26 px (20
wide when an arm reaches forward), facing right by default.

## Reduced motion

Every scene is drawn at `p = keyPose`, nothing loops, and Shrey stands in
whichever scene is nearest the reading line. Pick a `keyPose` where the
scene says the bullet on its own: the finished cut, the lit beacon, him on
the podium. Check it with `__timeline.setReduced(true)`.

## Reusing a level's art

The level themes already draw all ten places. To reuse a helper, add
`export` in front of it in `js/themes/<id>.js` (e.g.
`export function drawClip(…)`) and import it in your stop. Don't change what
it does; the level still uses it. Theme files register their kits, backdrops
and set pieces on import, and the levels already import them all.

To use a whole **set piece**, build it in a fake level:

```js
import { createLevelShim } from '../shim.js';

let lv, bar;
build() {
  lv = createLevelShim({ w: 320, h: 160 });           // or { rows, kit } for real tiles
  bar = lv.add('runbar', 4, 6, { len: 6, fact: 'x-ornl-2' });   // tile coords, the level's spec
},
draw(ctx, { p, w }) {
  bar.fill = span(p, 0.3, 0.7);                       // set its state from p…
  lv.camera.x = 0;                                    // …frame it…
  lv.drawAll(ctx);                                    // …and draw (back(), objects, enemies, draw())
}
```

The shim has platforms, enemies, objects, `state.built`, `game.progress`
(every fact logged unless you pass `found: [...]`), `game.content`, a hero
stub (off-screen until you move `lv.hero`), a camera whose `shake` does
nothing, and silent sound, particles and UI. A piece's `finish()` is
disabled (in a level it ends the level). **Don't scrub with `update()`**:
many pieces use `Math.random()` there. Set the fields that `draw()` reads
from `p` instead. `?debug=1` builds every set piece the levels use through
the shim and logs any that fail.

## The path between stops

`leave` picks how he gets to the next stop. To add a move (a zipline, the
Northeastern streetcar), call `registerMove('<id>.zipline', { shape, at,
draw })` from your stop file; see `js/site/path.js` for the four built in.
Prefix the name with your stop id.

## Testing

Serve the folder (`python3 tools/serve.py 4190`) and open `?debug=1`:

- the console shows `[timeline] 11 stops, 34 facts on the timeline`, the
  level-shim line, and any problem with your stop (unknown fact, duplicate
  id, a draw that threw: the scene shows a blank panel and logs once)
- the page shows the reading line, each box's id and `p`, and the frame cost
- `__timeline.goto('<id>', 0.4)` scrolls so the reading line is at that `p`;
  step through `p` by hand to check every beat both ways
- `__timeline.drawNow({ dir: -1, moving: true })` draws a frame immediately
  (a hidden tab defers animation frames and scroll events), here as if
  scrolling up
- `__timeline.state()` and `__timeline.layout()` show where everything is
- check desktop 1280 × 800 and phone 375 × 812 (scenes are 2 CSS px per art
  px on desktop, 1 on phones), and `setReduced(true)`

## Rules

- **Depict the real bullet.** The action shows what that line of the card
  says, nothing more. Shrey reads visuals as claims.
- **No invented numbers or words.** Any figure or label in the scene is in
  the card. If the card doesn't say it, the scene doesn't either.
- **Readable.** Canvas text goes through `drawText()` (never under 13 CSS
  px; on phones that is 13 art px, so keep labels to a word or two). Sentence
  case. Flat colours, no dithering.
- **Original art.** No Nintendo shapes or music cues, no company logos
  (names as text are fine), no `>_` blocks.
- **A key pose** that works without motion.
- **Unique names**: your stop id, and anything you register prefixed with it.

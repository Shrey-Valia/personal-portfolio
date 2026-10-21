# Building a stop

The website is a scroll timeline, newest first. Each stop is a pixel
**scene** (a canvas in the page flow) above a **card** (the résumé's own
HTML). As you scroll, Shrey walks the path down the page. When a stop is
the active one, its `p` runs from 0 to 1 with the scroll: the engine walks
him in, your action follows the scrollbar, the result holds, and he walks
out. Scrolling back up plays all of it in reverse.

What to draw is in `docs/TIMELINE-SCENES.md` (one section per stop). The
mechanics are in `docs/TIMELINE-ARCHITECTURE.md` §2–3. This file is the
contract between your stop and the engine.

## Your footprint

```
js/timeline/stops/<id>.js           your stop (replace the placeholder file)
docs/questions-stops-<group>.md     questions and requests for the kit or markup
```

Nothing else. Don't edit `stops/index.js` (the frozen list), `kit.js`,
`api.js`, `hero.js`, `palette.js`, `index.html` or CSS; ask in your
questions doc and the engine owner adds it (additively).

**Imports allowed:** `../kit.js`, `../../art/palette.js`, `../../art/sprite.js`,
`../../art/draw.js`, `../../engine/util.js`. **Banned:** anything in
`js/game`, `js/themes`, `js/ui`, and `font.js`. To reuse a level's art,
read its theme file and *copy* the drawing code into your module, turning
per-tick fields into functions of `f.act` and `f.hold` (e.g. a bridge's
`fill` becomes `fill = ease.outCubic(f.act)`). (`js/site/` is the first
draft's engine; it is removed in M2. Ignore it.)

## The module

```js
// js/timeline/stops/ornl.js
import { pose, STD, handAt, drawPath, routeDone, routePoints, sky, fadeEdges, ledge, coreX, FLOOR } from '../kit.js';
import { col } from '../../art/palette.js';
import { makeCanvas, ease } from '../../engine/util.js';

export default {
  id: 'ornl',                                     // == file name == data-stop
  facts: ['x-ornl', 'x-ornl-1', 'x-ornl-2', 'x-ornl-3', 'x-ornl-4'],   // exactly the list's

  // split: [0.15, 0.55, 0.85],                   // optional: where act, hold and out start
  // key: 0.7,                                    // optional: the p shown with reduced motion
  // idle: true,                                  // optional: f.t ticks (≤ 8 fps) during hold

  poses() { return { press: [pose({ torso: 'T_FWD', patch: [[10, 12, 'kdds']], hand: [10, 15] })] }; },

  build({ w, h, el }) {                           // once per width; el = the stop's element (read only)
    const [back, b] = makeCanvas(w, h);
    sky(b, w, FLOOR, ['indigo.0']);
    ledge(b, 0, FLOOR, w, 'steel');
    return { back, desk: coreX(w) + 40, route: { enter: [w / 2, 0], via: [[w / 2, FLOOR]], act: [coreX(w) + 40, FLOOR], exit: [w / 2, h] } };
  },

  draw(ctx, f, built) {                           // pure in (f, built)
    ctx.drawImage(built.back, 0, 0);
    drawPath(ctx, routePoints(built.route), { done: routeDone(built.route, f) });
    const fill = ease.outCubic(f.act);            // the RUN bar follows the scrollbar
    /* … */
    f.drawHero();                                 // he goes here in the layer order
    /* front props */
    fadeEdges(ctx, f.w, f.h);
  },

  hero(f, built) {                                // act and hold only; null → idle at route.act
    return { pose: f.act < 1 ? 'press' : 'type', frame: Math.floor(f.act * 8) % 2, x: built.desk, y: FLOOR, facing: 1 };
  },

  labels(f) {                                     // optional HTML labels over the scene
    return f.act >= 1 ? [{ text: 'Run complete ✓', x: 100, y: 12, tone: 'good' }] : [{ text: 'Run', x: 100, y: 12 }];
  },

  // transit: { build, draw, hero },              // optional: the themed move to the next stop
};
```

Every field but `id`, `facts` and `draw` is optional.

### The scene

- **100 game px tall, 160–240 wide.** The engine picks the width from the
  screen; `build` is called once per width. Keep his mark, the main
  mechanism and its labels inside the **centred 160 px** (`coreX(w)` is
  its left edge). The wings hold only secondary props.
- The engine backs the canvas at game-pixel size and scales it up whole
  (2 CSS px per game px on phones, 2.5 on tablets, 3 on desktop). Draw in
  game pixels; never set a transform or scale.
- Draw the whole box every frame (it is cleared first). Build static
  layers once in `build` and `drawImage` them.
- No frames. End with `fadeEdges(ctx, f.w, f.h)` so the scene steps into
  the page colour and reads as the path widening.

### `f`, the state you draw from

| | |
|---|---|
| `phase` | `before` (not reached; p 0) · `in` · `act` · `hold` · `out` · `after` (passed; p 1) |
| `act` | 0 → 1 through the act phase; 0 before it, 1 after it |
| `hold` | 0 → 1 through the hold phase |
| `walk` | 0 → 1 through his walk in (phase `in`) or out (phase `out`) |
| `p` | the raw 0 → 1 |
| `here` | he is in this scene (false for `before`/`after` stops) |
| `t` | the idle clock in ms: only in `hold`, only with `idle: true`, else 0 |
| `reduced` | reduced motion: you get the hold phase at `key`; draw the finished state, nothing loops |
| `dir` | -1 while the visitor scrolls up (he faces the way he moves) |
| `still` | the visitor stopped scrolling |
| `w`, `h` | the scene size |
| `drawHero()` | draws him at this point in your layer order |

**`draw` must be a pure function of `f` and `built`:** no `Math.random()`,
no `Date`, no state kept between calls, no DOM. That is what makes
scrolling back up play the scene backwards. Use `rng(seed)` from util in
`build` if you need noise. Aim for `build` ≤ 4 ms at 240 px and `draw` ≤ 1 ms.

### His route and his poses

`build` returns `route`: `enter` (on the **top edge**, y 0, within 8 px of
the centre), `via` (points on the way in), `act` (his mark), `leave` (points
on the way out), `exit` (on the **bottom edge**, y = h, within 8 px of the
centre). Default: straight down the middle to `[w/2, FLOOR]`. The engine
walks him along it in the `in` and `out` phases: mostly vertical legs are
drops (jump, fall, a crouch on landing), steep downhill legs are slides,
the rest are walks with the run cycle from distance travelled.

In `act` and `hold`, `hero(f, built)` places him: `{ pose, frame, x, y, facing }`,
where (x, y) is the point between his feet. Return `null` for idle at
`route.act`. While any part of his frame overhangs the scene's edge (he's
stepping in through the top or out through the bottom), the engine draws
him on the track layer instead of in your canvas, so don't rely on layering
at the edges.

**STD poses** (`'name'`, frame by number): `idle` (2), `blink`, `run` (4),
`jump`, `fall`, `crouch`, `skid`, `hurt`, `victory`, `lookDown`, `slide`,
`wave` (2), `point`, `type` (2), `carry` (both hands in front), `lift`
(hand overhead), `crossArms`, `speak` (2, mouth open then closed, hand at
chest), `climb` (2), `hang` (hands over his head, legs dangling), `hangOne`.
He is 18 × 26 (20 wide when an arm reaches forward), facing right.

**Custom poses** go in `poses()`: `pose({ head, torso, legs, patch, hand })`.
Parts are names from hero.js (`HEAD`, `HEAD_BLINK`, `T_IDLE`, `T_FWD`,
`T_BACK`, `T_UP`, `L_STAND`, `L_RUN1`–`L_RUN4`, `L_JUMP`, `L_FALL`) or rows in
hero.js's `LEGEND` (head 9 rows, torso 6, legs 7, 14 wide). `patch` is a
list of `[row, col, pixels]` over the 22-row frame (rows 0–8 head, 9–14
torso, 15–21 legs); columns 14–15 widen the frame on his facing side.
`hand: [row, col]` marks his hand. Names are local to your stop.

**Props in his hand:** `handAt(pose, frame, facing, local)` gives the hand
as `[x, y]` from his feet; draw the prop at `hero.x + x, hero.y + y`.
Scene-only overlays (Omi pendant, mortarboard, diploma, stamp) are yours.

### Labels

`labels(f, built)` returns `[{ text, x, y, tone, align }]`: real HTML over
the scene (aria-hidden; the card carries the meaning). x/y are game px,
the label's top edge, centred on x unless `align` is `'left'` or `'right'`.
Tones: `plain`, `good`, `bad`, `gold`, `cyan`. At most two at once, at most
four words each, and every one is résumé wording or a literal UI word.
**There is no canvas text anywhere**: drawing text on a scene throws.

### The move to the next stop (`transit`)

The engine draws a default connector from your exit down to the next
stop's entrance (switchbacks in the lane on desktop, nearly straight under
the card on phones). To theme it (a cage lift, slider steps, a zipline),
export `transit` and it replaces the default for the gap *below your stop*:

```js
transit: {
  build({ w, h, dy, from, to, side }) { return { /* cached art, the polyline */ }; },
  draw(ctx, g, built) { /* the hardware, as a function of g.s */ },
  hero(g, built) { return { pose, frame, x, y, facing }; },
}
```

The connector canvas is `w` wide (96 game px on desktop, 64 on phones),
centred on the page's centre line, and `h` (= `dy`) tall: `from` is your
exit on its top edge, `to` the next entrance on its bottom edge. `side` is
where the card sits beside it on desktop (`1` right, `-1` left, `0` the card
covers the middle, as on phones): keep hardware on the free side. `g` is
`{ s, dir, reduced, still }`, with `s` 0 → 1 along the move. Pure in `g`;
with `reduced`, draw the hardware formed (he isn't shown).

## Testing

Serve the folder (`python3 tools/serve.py 4190`) and open
**`/tools/stop.html?stop=<id>`**, the test bench. It runs your stop through
the same runtime as the page:

- **Width** 160–240, **p**, and **He is** (here / not yet / gone)
- **Scale** phone 2 / tablet 2.5 / desktop 3, **Reduced motion**,
  **Scrolling up**, **Not scrolling**, **Idle clock**, and the **160 core** outline
- **Play down and back** sweeps p 0 → 1 → 0
- **Move to the next stop** previews your `transit` (or the default) with an `s` slider
- **Run checks**: widths 160 and 240, p 0 to 1 in tenths, reduced on and off,
  before and after, route rules, labels, no canvas text, and determinism
  (p 0.37 → 0.9 → 0.37 must draw the same pixels). It must say OK.

On the page, `?debug=1` runs the same checks for every stop plus the page
checks (11 stops in order, 34/34 facts each claimed once).

## Rules

- **Depict the real bullet.** One claim per scene, at most two beats, a
  clear before and after. Shrey reads visuals as claims.
- **No invented numbers or words.** Counts come from markup in `build`
  (`el.querySelectorAll('[data-credit]').length`); figures only from the
  card. If the card doesn't say it, the scene doesn't either.
- **Readable.** Flat colours, no dithering, labels short. One-off colours are
  `'#hex'` values (quantized by `col()`); never add a palette ramp.
- **Original art.** No Nintendo shapes or cues, no company logos (names as
  text are fine), no `>_` blocks, no `?` glyphs, coins or stars.
- **Reduced motion** shows the finished state, readable without motion.
- If your stop throws, the page logs `[timeline] stop "<id>" failed` and
  shows the placeholder instead; it never takes the page down.

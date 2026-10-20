# Game critique

Branch `game-v2` at `6204cbf`, played 2026-10-20 on `python3 tools/serve.py 4180`
with `?debug=1&fresh=1` (and `&level=ornl`). The browser pane throttled
`requestAnimationFrame`, so most play was frame-stepped through `window.__game`
with real inputs (`input.down/up`), plus real keyboard, mouse and synthetic touch
pointer events. Covered: title, overworld, Home, Oak Ridge Lab end to end
(all 5 facts, Inverse Design room, both ports, tally), HUD, cards, pause menu,
résumé dialog, game over, one pit death and one enemy death. Sizes: 1280×800
(DPR 2, so W = 426), 812×375 landscape (W = 480, touch class forced on), and
375×812 portrait (mobile emulation, DPR 2). No console errors at any point.

**Owner** says who should fix it. **Engine** means the coordinator (shared
files every level uses). **Level** means the Home or Oak Ridge files only.

## What already works (leave it alone)

- Jump feel is good: coyote time, buffering, corner correction, variable height,
  apex hang, stomp hit-stop. ↑ jumps everywhere, as Shrey asked.
- Fact text is real DOM in native `<dialog>`s with good focus handling
  (focus lands on Continue, Esc closes, focus returns to the stage), an
  `aria-live` announcer, and a visible 3 px focus ring.
- A recruiter on desktop is one click from everything: the title screen has
  Read résumé plus Email, LinkedIn and GitHub links.
- The Oak Ridge set pieces make real claims: monomers snapping into a chain,
  a RUN bar extruding into a bridge, design-input sliders rising once the
  target-properties block is hit, four GPU racks moving in lockstep.
- CPU cost is tiny: about 0.02 ms per update and 0.3–0.4 ms per render at
  1280×800 (canvas 2556×1296).

---

## P0: bugs and blockers

### P0-1 Portrait phones: the first screen has no name, and "Play anyway" dead-ends
- **Where:** `js/boot.js:108` (`orient`), `css/game.css:353-369` (`.rotate`), `js/engine/display.js`.
- **Problem:** A recruiter tapping the link in the LinkedIn app sees only
  "Turn your phone sideways to play" with two buttons. There's no name, pitch
  or contact. Tapping **Play anyway** shows the game in a 240×108 CSS px box
  (integer scale 1 at DPR 2). The title panel is ~330 px tall inside that
  box, so the Play button sits at y=583 while the box ends at y=460, clipped
  and untappable. `--px` drops to 0.5 px, which shrinks the HUD bar to 7.5 px.
  At DPR 3 (computed, not measured) the box is 320×144, which still clips Play.
- **Fix:** Put the name, one-line pitch and contact links on the rotate card,
  above the buttons. In portrait, make **Read résumé** (or the new page view
  from `claude/page-view-c30408`, which already links `#page` from that card)
  the primary path. Remove "Play anyway", or make it lay out a portrait game
  (title panel scrollable, `overflow: auto` on `.title`, controls below the
  canvas).
- **Owner:** Engine. See question 1.

### P0-2 The Contact node (Lighthouse) can't be reached with keys or the d-pad
- **Where:** `js/game/map.js:23`, `js/game/scenes/overworld.js:84-98`.
- **Problem:** The only road to the Lighthouse leaves Home heading (30, 18).
  Pressing → picks Oak Ridge (dot 1.00 vs 0.86) and ↓ picks Dublin High
  (0.74 vs 0.51). Only ↓ and → pressed in the *same 16 ms step* reaches it,
  because `tryDirection` reads `pressed`, not `held`. I confirmed this by
  stepping: right → ornl, down → dhs, down-then-right → dhs, same frame →
  lighthouse. The touch d-pad has no diagonals, so only tapping the node works.
  The Lighthouse also looks adjacent to Oak Ridge, but no road connects them.
- **Fix:** Add a road `ornl ↔ lighthouse` (open from the start). In
  `update()`, build `dx/dy` from `held` whenever any direction is `pressed`,
  so holding ↓ then tapping → gives a diagonal. When two roads score close,
  prefer the one whose overall direction (first to last point) matches.
- **Owner:** Engine (map data + overworld input).

### P0-3 Two level branches already claim enemy char `z`
- **Where:** `js/game/enemies.js:132` (`registerEnemy`), `js/game/scenes/level.js:102-104`. Claims are in the shared notes folder.
- **Problem:** levels-work registers `z` (Label Factory noise cloud) and
  levels-projects registers `z` (Trading flash-crash hopper). Registries are
  global and last import wins, so after the merge one level silently spawns
  the other level's enemy. Enemy chars are also checked before `marks`, and a
  char that is already handled by the `switch` (`F K c C G S N P @`) can be
  registered and then never spawns. Kits, backgrounds, set pieces, skins and
  songs collide the same way.
- **Fix:** Before merging, rename one `z`. In every `register*`, throw in
  debug (or `console.error` always) when a name or char is already taken or
  reserved. Better: let a level declare its enemies per room
  (`enemies: { z: NoiseCloud }`) so chars are scoped to the level.
- **Owner:** Engine, plus one of the two level branches.

### P0-4 Port entry only works in the middle 20 px of a 32 px cap
- **Where:** `js/game/objects.js:241-244`, `js/game/scenes/level.js:266-277`.
- **Problem:** `standingOn` needs the hero's centre within `x+6…x+26`. The hero
  is supported anywhere across about 42 px of positions. On all three ports I
  tried (Home, the Web Tool port, the Inverse exit), a normal "jump on and let
  go" landed 1–4 px outside the window. The hero stands visibly on the cap,
  ↓ only crouches, and the ▼ prompt doesn't appear, so there's no hint why.
  Tiny taps barely help: 4 frames of ← moves 1.5 px. This is the last step
  of the tutorial.
- **Fix:** Accept ↓ anywhere the feet overlap the cap by ≥ 4 px, then snap
  the hero to the centre as `tryPort` already does (`hero.x = p.x + 11`). Show
  the ▼ under the same condition.
- **Owner:** Engine.

### P0-5 "Skip this level" is always visible
- **Where:** `css/base.css:104-105` (`.pbtn { display: inline-flex }`), `js/ui/dialogs.js:66`, `index.html:145`.
- **Problem:** `menu-skip.hidden` is `true`, but the class's `display` beats the
  UA `[hidden]` rule, so the button shows from the first pause with 0 game
  overs. One click marks the level cleared and opens its roads.
- **Fix:** Add `[hidden] { display: none !important; }` to `base.css`. That
  also protects every future `hidden` toggle the level builders add. Then
  decide whether skip should be always on (question 6).
- **Owner:** Engine.

### P0-6 Résumé dialog: found-markers print over the contact links
- **Where:** `css/resume.css:141-149` with `.resume__contact` (`css/resume.css:25-32`).
- **Problem:** `li[data-fact]::before { left: -40px }` assumes a stacked list,
  but the contact `<li>`s sit in one flex row with a 22 px gap. The rings for
  LinkedIn and GitHub land on the end of the previous link
  ("…northeastern.ed⭘u", "…shrey-vali⭘a"). On desktop these are the links a
  recruiter came for. (Under 600 px the markers are hidden, so phones are fine.)
- **Fix:** `.resume-dialog .resume__contact li[data-fact]::before { left: -16px; }`
  with `padding-left: 16px` on those `li`s, or drop the markers from the
  contact row. `css/resume.css` is also edited on the page-view branch, so
  apply this after that merge.
- **Owner:** Engine.

### P0-7 Scene changes requested during a fade-in are silently dropped
- **Where:** `js/game/game.js:76-79`.
- **Problem:** `transition()` chains a new `mid` onto the running transition.
  After the midpoint, `tr.mid` has already been replaced by a no-op and
  `tr.t === tr.dur` never happens again, so the chained call never runs.
  Repro: die, and during "Reverting to last commit…" press P → **Return to
  map**. The menu closes and you stay in the level. I confirmed this by
  stepping: `leaveToMap()` at t=20 of 32+30 leaves the scene a `LevelScene`.
  The same happens to Skip, résumé fast-travel and port arrivals that land in
  that window.
- **Fix:** If `this.trans.t >= this.trans.dur`, queue the request and start a
  new transition when the current one ends. Alternatively, ignore pause input
  while `this.trans` is set.
- **Owner:** Engine.

### P0-8 Oak Ridge bridge 2: walking along the chain drops you into the pit
- **Where:** `js/game/levels/ornl.js:116` (mark `3`, segs `[0,0,2],[2,-1,4],[6,0,2]`).
- **Problem:** The chain draws a diagonal bond up to its raised middle, which
  reads as a ramp. Physics has no step-ups, and the raised segment is a
  one-way platform 16 px higher, so holding → walks under it and falls.
  I reproduced this twice. There's no checkpoint before it (P1-3), so the
  respawn is at the level start. This breaks the "fair" rule in
  `BUILDING-LEVELS.md`.
- **Fix:** Use a flat bridge here (`[[0,0,8]]`). If the kink stays, make it
  readable: draw a vertical step instead of the diagonal bond, and leave a
  low segment under the raised one so a walk-under doesn't kill.
  Bridge 3 (stairs) reads as stairs and is fine.
- **Owner:** Level (Oak Ridge).

### P0-9 Riding a moving platform can push the hero into walls and ceilings
- **Where:** `js/game/hero.js:136-139`.
- **Problem:** The platform's delta is added to `x/y` with no collision check,
  and `moveX` only runs when `vx !== 0`. In a synthetic test (a platform
  moving 1 px/step into the Oak Ridge GPU-hall wall), the hero ended up
  embedded 1 px in the wall and was popped 6 px up inside it. The current
  lifts have no ceiling, so nothing in Oak Ridge triggers it. Any builder's
  horizontal mover or lift under a ceiling will.
- **Fix:** Feed the carry through the same resolver: `moveX(b, map, dx)` and
  `moveY` with the platform delta (or add the delta to `vx/vy` for one step).
  Clamp it with the same solid check.
- **Owner:** Engine.

---

## P1: important

### P1-1 Coffee only pops out where a running jump can reach it, and touch can't run-jump
- **Where:** `js/game/objects.js:91-93` (Coffee floats 12 px above the block), `js/game/hero.js:76`, `js/game/game.js:17`.
- **Problem:** At the documented height (row 7), the coffee sits at y 100–111.
  A walking jump peaks with the feet at ~116, which is below the block top
  (112), and the block's side blocks any side approach. I confirmed walking
  jumps miss it and a running jump gets it. On touch, a running jump needs →,
  B and A at once, and one thumb owns one button. `game.autoRun` exists but
  nothing ever sets it. Coffee is the only way to get the shield back.
- **Fix:** Pop the coffee onto the floor next to the block and let it slide,
  or collect it on the bump itself. Set `autoRun = true` while `touch-on` is
  active, or make B a toggle.
- **Owner:** Engine.

### P1-2 One exception freezes the game for good, and level data isn't validated
- **Where:** `js/engine/loop.js:9-24`, `js/game/scenes/level.js:85-97`.
- **Problem:** `boot()` is wrapped in try/catch, but `update/render` in the rAF
  loop aren't. A throw stops `requestAnimationFrame` and the visitor gets a
  dead canvas. Data mistakes cause these throws: more `F/S/N/P` chars than ids
  in `facts`/`duck`/`ports` give `undefined`. A missing port link throws in
  `portArrive`. A missing fact id is added to progress (and saved) as
  `undefined`, which inflates the counter. A missing kit throws in `prerender`.
- **Fix:** Wrap the frame body in try/catch. On error, log it, stop the loop,
  and run the same `fail()` fallback (résumé back in `<body>`). Add a
  `validateLevel(def)` that runs in debug at registration: char counts vs
  arrays, kit/theme/skin/music exist, ports' `exit` indexes exist, fact ids
  exist. Print it next to the coverage line.
- **Owner:** Engine.

### P1-3 No checkpoint in the first 82 of Oak Ridge's 198 columns
- **Where:** `js/game/levels/ornl.js:55` (first `C` is in WEBTOOL).
- **Problem:** Plaza and Assembly have the three bridge pits, the kink trap,
  the hopper and the staircase, and every death there restarts at spawn
  (~45–80 tiles back, 20–50 s). The hopper sits two tiles from the end of
  bridge 1, on a five-tile island between two pits. It's the first homing
  enemy, and I took both of my enemy hits there.
- **Fix:** Add a `C` at the start of ASSEMBLY (around ASSEMBLY col 1). Move
  the hopper to the middle of a wider, pit-free stretch, or 5+ tiles from the
  bridge landing.
- **Owner:** Level (Oak Ridge).

### P1-4 "Fixed" rooms are 480 px wide, but laptops get W = 426
- **Where:** `js/game/levels/home.js:18-33` and `js/game/levels/ornl.js:78-93` (30 columns each), `js/engine/camera.js:28-33`.
- **Problem:** At 1280×800 DPR 2, W is 426. Depending on window shape, W
  ranges from 384 to 480. The fixed camera then scrolls. In Home, "Stand here, press ↓"
  is cut off at the right edge on first view. In Inverse Design you arrive
  with the exit port and ledge half off-screen to the left. Neither works as
  the "one-screen reading room" the doc promises.
- **Fix:** Document and lint "fixed rooms ≤ 24 columns (384 px)". Make Home
  and Inverse 24 wide. If a room must be wider, centre on the room's
  points of interest, not the hero.
- **Owner:** Engine (rule + lint) and Level (Home, Oak Ridge).

### P1-5 Touch controls cover the play area and keep keyboard copy
- **Where:** `css/game.css:296-351`, `index.html:103-114`, plus copy in `home.js:35`, `level.js:377`, `game.js:72`, `objects.js:190`.
- **Problem:** At 812×375 the 132 px d-pad covers the hero at both spawns and
  the bottom-left 40% of the canvas height. The d-pad has no diagonals.
  Touch players see keyboard copy: `kbd` chips (R, M, N, P) on the HUD,
  "Enter to read" over signs, the duck's "press R anytime", the toasts
  "Pause (P)" and "in the résumé (R)", and "Esc" on the résumé close button.
  There's no touch interact button, so a sign can't be re-read.
- **Fix:** Spawn the hero at col ≥ 5 (or shift the camera) whenever
  `touch-on`. Shrink the pad to ~110 px at 30–40% opacity, or move it into
  the side bars when they're ≥ 120 px. Accept diagonal touches (split each
  key's hit area into thirds). Hide `kbd` under `.touch-on`, and route
  in-game copy through a `keys`/`touch` pair like `hints` already does.
  Tapping a sign should open it.
- **Owner:** Engine.

### P1-6 Closing a card also locks movement
- **Where:** `js/ui/dialogs.js:26`, `js/ui/resume.js:60`, `js/engine/input.js` `lockAll`.
- **Problem:** Signs auto-open while you're walking with → held. When the card
  closes, `lockAll()` locks *every* action until it's released, so the hero
  stands still while → is still held, until you lift and press again. It
  reads as a stuck controller. That's 5 times per Oak Ridge run.
- **Fix:** Lock only `jump`, `confirm` and `interact` on close. Movement and
  `run` should resume from whatever is held.
- **Owner:** Engine.

### P1-7 The hero is hard to see against the lab
- **Where:** `js/art/sprites/hero.js` (palette), `js/art/backgrounds.js` (`labDawn`).
- **Problem:** Dark hair, a dark hoodie and dark trousers sit on a navy and
  purple skyline with lit windows. At 1280×800 the hero is the
  lowest-contrast object on screen, and on a phone he nearly disappears.
- **Fix:** Give the hoodie a bright, saturated colour (teal or gold), add a
  1 px light rim on the back-lit edge, or darken and desaturate the backdrop
  layers behind the play band (rows 8–11).
- **Owner:** Engine (shared sprite). Check every theme's backdrop against it.

### P1-8 Inverse Design: the used block bonks the first climb jump
- **Where:** `js/game/levels/ornl.js:85-88` (F at col 17, row 7), slider tracks `ornl.js:137`.
- **Problem:** Slider 1 spans x 252–276 and the used block x 272–288, with 4 px
  of headroom between them. Jumping from most of slider 1 hits the block, and
  the jump dies. Only the left ~10 px of the slider are clear. I hit this
  twice in a row.
- **Fix:** Move the F one or two columns right (col 18–19), or move track 1 to
  col 15.
- **Owner:** Level (Oak Ridge).

### P1-9 "Hit RUN ▶ to build", but there's no RUN button
- **Where:** `js/game/setpieces.js:119`, `js/game/levels/ornl.js:52-56,122`.
- **Problem:** The label points at a RUN control, but the trigger is the
  ordinary `>_` block three tiles back. The empty track over the 9-wide pit
  is dark slate on a dark pit and is easy to miss.
- **Fix:** Give that block a RUN ▶ face (a custom `InfoBlock` skin from the
  runbar spec), or change the label to "Hit >_ to run". Brighten the empty
  track outline.
- **Owner:** Level (Oak Ridge).

### P1-10 In-world text floors at 11 CSS px
- **Where:** `js/art/font.js:11` (`MIN_CSS = 11`).
- **Problem:** Desktop is fine (size 7–8 becomes 21–24 px). On phones,
  `CSS_PER_PX` is 1.3–1.7, so every hint, duck bubble, label, GPU tag and
  "Running… 50%" renders at 11–12 px. Shrey asked for readability.
- **Fix:** Raise `MIN_CSS` to 13 and make the duck bubble's `maxW` grow
  when the floor kicks in, so lines rewrap instead of overflowing.
- **Owner:** Engine.

### P1-11 Every fact is a modal
- **Where:** `js/game/scenes/level.js:230-253`, `js/ui/dialogs.js:40-58`.
- **Problem:** 34 facts means 34 full-stop dialogs. They break flow, and with
  P1-6 each one costs a re-press. The 24-frame delay also hides the payoff
  animation: the RUN bar starts filling, then the card covers it.
- **Fix:** See question 3. Whatever Shrey picks, open the card *after* a set
  piece's reaction finishes (the RUN bar or sliders), not 24 frames after the bump.
- **Owner:** Engine.

### P1-12 The map unlocks hide the best content
- **Where:** `js/game/map.js:24-29`.
- **Problem:** Droid Strike (1st place, the strongest award) needs Dublin High
  *and* Northeastern cleared. Trading needs Vincio. On the current branch,
  nodes without a level can't be cleared at all, so those roads stay locked.
  After the merge that's fixed, but a 60-second visitor still sees four
  locked roads.
- **Fix:** See question 2.
- **Owner:** Engine (map data).

### P1-13 A 60-second recruiter gets little from the title screen
- **Where:** `index.html:84-99`.
- **Problem:** The title says "CS + CE @ Northeastern · ML research @ Oak Ridge"
  and nothing else: no availability, no highlights. The HUD's "Facts 0/34"
  signals a long grind. Playing everything takes 15–20 minutes. Oak Ridge
  alone is 2–3 minutes with its five cards.
- **Fix:** See question 4.
- **Owner:** Content (Shrey).

---

## P2: polish

| # | Where | Problem | Fix | Owner |
|---|---|---|---|---|
| 1 | `level.js:461-469`, `ornl.js:114` | The Oak Ridge title card covers the plaza banner for 2.5 s, and both say the same thing. | Draw the intro card higher (y≈30), or drop the banner's text while `intro > 0`. | Level |
| 2 | `level.js:239`, `objects.js:278-297` | "+1 fact" and the `>_` token fly up under the HUD for blocks at rows 2–3 (both Oak Ridge wall blocks). | Clamp floater/token y to ≥ 22. | Engine |
| 3 | `objects.js:269-272` | The port ▼ is drawn 30 px above the cap. For the Inverse exit (row 3) it's under the HUD. | Clamp it to ≥ 18, or draw it beside the hero. | Engine |
| 4 | `css/game.css:104-127` | The map banner covers the bottom-row labels (Northeastern, Droid Strike). | Move the banner to the top (under the HUD), or auto-fit it away from the selected node. | Engine |
| 5 | `overworld.js:149` | Clicking a node's label does nothing for top-row nodes and works only on the top half for the others. There's no hover cursor. | Include the label box in the hit test, and set `cursor: pointer` on hover. | Engine |
| 6 | `index.html:140-142` | "Resume game" sits right above "Read résumé". It's the same word, one accent apart. | "Back to game" / "Continue". | Engine |
| 7 | `boot.js:107`, `game.js` | The HUD **Map** button opens the pause menu, not the map. | Go straight to the map (pause stays on P). | Engine |
| 8 | `level.js:417` | Tally "Time" is wall clock, so reading cards counts against you (my run showed 5:29). | Use `this.t / 60` over unpaused steps, or drop it. | Engine |
| 9 | `objects.js:104-116`, `level.js:52` | Checkpoint flags reset to grey whenever a room reloads (after a port). Touching one again moves the checkpoint *back*. | Keep `on` in `roomStates`, and ignore flags left of the current checkpoint. | Engine |
| 10 | `index.html:208-209` | The Oak Ridge sign card's kicker repeats its title ("Oak Ridge National Laboratory · ML Research Assistant" over "Oak Ridge National Laboratory"). | Kicker "Experience" for the `entry__head` fact, or put the role in the title. | Content |
| 11 | `setpieces.js:273-298`, `ornl.js:135-137` | Design inputs shows 3 bars for 4 sliders, and bar lengths don't match slider heights, which weakens the inverse-design claim. | One bar per slider, with length matching that slider's height. | Level |
| 12 | `ornl.js` GPUHALL | The conveyor stands for "preprocessing pipelines" but carries nothing. Three of the four lifts are scenery, since only the right one reaches the wall. | Ride little data tiles (CSV rows) along the belt into the GPU racks. Offset the wall so any lift works. | Level |
| 13 | `ornl.js:27-42` | The bridges assemble *before* the GNN fact that explains them, so the beads read as decoration until later. | Put a small "monomers → chain" label at the first pit, or move the F before bridge 1. | Level |
| 14 | `js/art/sprites/items.js` | Bits are gold coins and ports are grey pipes, so they read as Mario props, not computing ones. | See question 5. | Engine |
| 15 | `input.js:61-64` | Releasing one of two keys bound to an action releases the action (hold Space, tap and release ↑ = jump cut). | Count held keys per action. | Engine |
| 16 | `input.js:55-56` | After Tab moves focus to a HUD button, Space presses that button instead of jumping. | On `keydown` of a game key while a HUD button is focused, blur it back to the stage. | Engine |
| 17 | `save.js:21-27` | The save is debounced 400 ms with no flush, so closing the tab right after a clear can lose it. | Flush on `pagehide` and on `visibilitychange` to hidden. | Engine |
| 18 | `css/*.css` | No `prefers-reduced-motion` rules: the card bounce, toast slide, HUD bump and résumé flash all still animate. | One `@media (prefers-reduced-motion: reduce)` block that removes them. | Engine |
| 19 | `index.html` | 39 JS modules whose imports chain up to 7 levels deep, against an 8 s fallback timer. That's risky on slow mobile. No `og:image`, so link previews in LinkedIn and Slack are blank. | Add `<link rel="modulepreload">` for the graph and a 1200×630 `og:image`. | Engine |
| 20 | `css/game.css:88` | HUD buttons are 32 px tall on phones. | `min-height: 44px` under `.touch-on`. | Engine |
| 21 | `docs/BUILDING-LEVELS.md` | Oak Ridge has four signature mechanics but the doc says "at most one". Builders copy the flagship. The doc also doesn't list reserved map chars. | Say Oak Ridge is the exception, list reserved chars, and add the room-width rule from P1-4. | Engine |

---

## Questions for Shrey

1. **What should a phone visitor see first?**
   (a) The game everywhere, as now. (b) **The text/page view on portrait
   phones and the game on desktop and landscape, with a "Play" link that asks
   to rotate.** (c) The page view everywhere, with a big Play button.
   *Recommend (b):* most recruiters open links on a phone held upright, and
   today they get a rotate prompt with no name on it.

2. **Should the map be gated?**
   (a) Keep the chained unlocks. (b) **Open every road from the start;
   clearing a level adds its ✓ and fact pips.** (c) Keep the gates but open
   Droid Strike and Lighthouse from Home.
   *Recommend (b):* the hackathon win is the strongest line on the résumé and
   currently sits two levels deep.

3. **How should a found fact appear?**
   (a) A modal card every time, as now. (b) **A non-blocking card that slides
   in at the side while play continues; tap or press to expand it, and it's
   logged either way.** (c) Modal for a level's first fact, side card after.
   *Recommend (b):* 34 hard stops is a lot of interruption, and every fact is in the résumé anyway.

4. **What goes on the title screen besides the name?**
   (a) Keep it as is. (b) **Add one availability line ("Open to summer 2027
   internships", once you confirm it; it's inferred today).** (c) Add that
   line plus three highlight chips (ORNL GNN research · 1st place Droid Strike
   Back · Vincio AI video editor).
   *Recommend (b),* or (c) if you want the 60-second visitor to leave with
   specifics without pressing Play.

5. **How Mario should the shared props look?**
   (a) Keep coin-shaped bits and pipe-shaped ports: instantly readable.
   (b) **Re-skin them as computing objects: bits as glowing 0/1 glyphs, ports
   with a socket face (still enterable from the top).** (c) Change the bits only.
   *Recommend (b):* it's cheap, it's on-message, and it moves the game further
   from Nintendo's look.

6. **Should "Skip this level" always be available?**
   (a) Only after two game overs, as designed. (b) **Always in the pause menu;
   skipped levels show their facts as unlocked in the résumé.** (c) Remove it.
   *Recommend (b):* a recruiter who wants Droid Strike shouldn't have to beat
   Dublin High first. (A CSS bug makes it always visible today anyway; see P0-5.)

7. **How dense should the other eight levels be?**
   (a) One signature mechanic each, per the build guide (~60 s).
   (b) Oak Ridge density, three or four mechanics (~2–3 min). (c) **One
   mechanic each, with Oak Ridge kept as the flagship exception.**
   *Recommend (c):* it keeps a full playthrough under ~15 minutes.

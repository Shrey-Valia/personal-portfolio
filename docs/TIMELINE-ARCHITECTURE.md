# Scroll-driven timeline website: architecture and multi-agent plan

I only read files for this. The page-view branch (`claude/page-view-c30408`) is the base. I kept its view state machine (`js/ui/page.js`), its single content source and its print stylesheet. All three coordinator messages are answered in the sections below.

---

## 0. Decisions at a glance

- **Text stays in HTML.** Every word stays in `index.html`. I restructure it once into the timeline order, keeping every `data-fact` id. With JS off you get the full résumé in the same order the hero walks.
- **Canvases are decoration only, with no text in any canvas.** Each stop has its own scene canvas in the page flow. There is no fixed full-viewport canvas and no sticky stage.
- **One hero for the whole page.** Between stops he is a small element positioned in page coordinates on a track layer. During a stop he is drawn inside that stop's scene canvas.
- **His position is a pure function of scroll position.** It is computed from a table of breakpoints built whenever the layout is measured, so scrolling up replays everything exactly in reverse.
- **Actions follow the scrollbar.** Only small idle loops (blink, monitor flicker) run on a timer, only while he holds his final pose at a stop, and never under reduced motion.
- **The game loads only on `#play`.** None of the game's code (the 8 levels, about 7k lines of theme files) downloads on the landing page.
- **Stops are plug-ins with a frozen list.** Each stop is one file. The list of all 11 stops is created once with working placeholders. A stop builder edits only their own file, so there are no global name registries to collide.

---

## 1. Timeline order: checked against the dates

| Item | Start | End | Sorted by start date |
|---|---|---|---|
| Vincio | Jan 2026 | Aug 2026 | 1 |
| Oak Ridge (ORNL) | Jan 2026 | May 2026 | 2 (same dates as Handshake; ORNL first because it matters more) |
| Handshake AI | Jan 2026 | May 2026 | 3 |
| **Droid Strike Back** | Nov 2025 | one-off event | **4** |
| **Northeastern** | ~Sep 2025 (not stated on the résumé) | May 2029 (expected) | **5** |
| Dublin High diploma | Jun 2025 (the diploma date) | | 6 |
| EduLearn | Oct 2024 | | 7 |
| Trading bot | Apr 2024 | Aug 2024 | 8 |

- **Shrey's order doesn't match any single rule.**
  - Sorting by start date puts Droid (Nov 2025) above Northeastern (Sep 2025).
  - Sorting by end date or "still going" puts Northeastern at the very top. That repeats the intro.
- **Recommendation:** swap so Droid comes before Northeastern. The rule is start date, newest first; ties go to the later end date, then the stronger item.
  - It also reads well walking down the page: from Droid you step back to "started Northeastern", and Droid happened while he was there.
- **Dublin High is placed by its diploma date (Jun 2025), not by when he started (2021).**
- **Undated items go at the end:** Intro, the 8 dated stops, **Skills** ("what's in the backpack"), then **Contact**, where the path ends.
  - Every skill is one tap away in the Jump menu.
  - The coursework stays inside the Northeastern card.
  - "Open to work" (`c-open`) sits in the intro, and its text is repeated at Contact.
- **The order lives in one place: the order of the articles in `index.html`.** The stop list file only maps each id to its file. A debug check fails if the two disagree, so going back to Shrey's order means moving one `<article>`.
- **Needs Shrey:** Northeastern's start month. A "Sep 2025" date has to be added to the HTML and marked `data-flag="inference"` until he confirms it.

---

## 2. Rendering architecture

### 2.1 What is HTML and what is canvas

- **HTML:**
  - All text
  - Dates, as `<time datetime>`
  - The "highlight chips"
  - The "More" buttons
  - The navigation bar and Jump menu
  - Year markers
  - Any label that appears over a scene
- **Canvas (`aria-hidden`):**
  - Scene art
  - The path between stops
  - The hero

There is no canvas text anywhere. Stop files may not import `font.js`; in debug mode `fillText` and `strokeText` throw inside stop drawing.

That also settles **coordinator constraint 1**: `drawText`'s single global render scale is never used on the website. The game is loaded lazily and is never on screen at the same time, so its `setTextMetrics` has nothing to fight with.

### 2.2 Layers, from back to front

```
<main id="resume" style="position:relative">
  scene canvases   in each stop's .stop__scene box (z 0); drawn once, redrawn only while that stop is active
  .tl-track        absolute, covers <main>, z 1, aria-hidden:
                   - one connector canvas per gap between stops (the path), drawn once per layout
                   - .tl-hero: one small canvas moved with transform (the hero while travelling)
  .stop__card      z 2, solid background (the text always sits above the track)
```

- **Why not a fixed full-viewport overlay?** The canvas would be redrawn on the main thread one frame behind the browser's scrolling. During an iOS momentum fling, scenes would visibly drift away from their cards.
- **Why not a sticky stage?** It takes 25–35% of a phone screen away from reading, and it complicates the geometry.
- **Why this works:** scenes and path scroll natively with the page, so they never drift. The hero lives in page coordinates, so a late frame leaves him slightly behind on the path but never off it.

The CSS stacking order also handles phones for free. On phones the card covers the path, so the hero walks under the card where his path passes behind it (section 5).

### 2.3 Crisp pixels at device resolution

I reuse the scaling math from `display.js` (a whole number of device pixels per game pixel, a width clamped to a range, even widths). I don't reuse its device-resolution backing store, the `rs` transform or `drawText`:

- Every timeline canvas is backed at game-pixel size and scaled up by CSS with `image-rendering: pixelated`. CSS size = `gamePx × scale / dpr`, so each game pixel lands on exactly `scale` device pixels.
- `scale = max(1, round(--gp × dpr))`. `--gp` is the target number of CSS px per game pixel, set by CSS per breakpoint: 2 on phone, 2.5 on tablet, 3 on desktop. That gives a hero of 36×52 CSS px on phone and 54×78 on desktop.
- Boxes are placed on whole device pixels (`round(v × dpr) / dpr`).
- **One scale for the whole page**, so the hero, the path and every scene share the same pixel size.
- Memory stays under 5 MB in total. Backing at device resolution would be about 40 MB at dpr 3.
- Scene size is **100 game px tall everywhere** and **160–240 game px wide**; the engine picks the width. Anything important must sit in the **middle 160 px** (the same idea as the game's 384–480 rule).
- CSS reserves the box height (`--scene-h`) before any JS runs, and the canvas is centred inside it, so there is no layout shift when it appears.
- **Coordinator constraint 4:** the website does not use the game's canvas setup (`ctx.setTransform(rs…)`, `ctx.W`) or its backdrops, which assume a 216 px height. Scenes draw their own backdrop at their own size.
- **To check early:** that `pixelated` upscaling is crisp in iOS Safari (first milestone of session S1). If it isn't, back only the on-screen scenes at device resolution and free them when they scroll away.

### 2.4 Mapping scroll position to the hero (deterministic and reversible)

**When the layout is measured** (on load, on `document.fonts.ready`, from a ResizeObserver on `<main>`, after returning from the game, and after a "More" toggle), one batch of reads, then the maths:

1. **Read every scene's rectangle in page coordinates.** Also read a stable viewport height (`vh`) from a hidden fixed element with `height: 100svh`. Re-measure on width changes or height changes over 150 px, so the iOS address bar can't make the hero jump.
2. **Give each stop a "dwell window"** `[a, b]` in scroll position: the range in which that scene's centre moves from `from·vh` down to `to·vh`.
   - Desktop: from 0.80 to 0.20. Phone: 0.95 to 0.05.
   - Overlapping windows are split at the midpoint, keeping at least 40 px for the walk between them.
   - Everything is clamped to `[0, maxScroll]`.
   - The **intro's** window starts at scroll 0 in its "hold" phase, so the hero is standing at his door on load.
   - The **Contact** window ends at the bottom of the page, so the beacon finishes lighting exactly when you reach the end.
3. **Walks between stops** run from scene N's exit to scene N+1's entrance, over the scroll range from the end of window N to the start of window N+1.
   - That scroll distance is shared across the path segments by weight: `max(Δy, 0.6·|Δx|)`.
   - The result is that the hero moves at about the speed the page scrolls and stays around 40–60% down the screen.

**Each frame (pure):** `sample(scrollY, dir)` returns one of:
- `{dwell, stop, p}` with p from 0 to 1
- `{transit, gap, s}`, his position along the path

Every other stop is in "before" (p = 0) or "after" (p = 1). `dir` is the sign of the last scroll change; it only flips which way he faces.

**How a stop's p is split** (the shared default; a stop may override it with `split`):

| Phase | Range of p | What happens |
|---|---|---|
| in | 0–0.15 | The engine walks him from the entrance to the action spot |
| act | 0.15–0.55 | The stop's action, following the scrollbar |
| hold | 0.55–0.85 | The finished result plus optional idle loop |
| out | 0.85–1 | The engine walks him to the exit |

A scene centred on screen (where people stop to look) has p near 0.5, so the claim is already shown.

**Poses along the path are also pure:**
- The walk cycle frame is `floor(distance / 5) % 4`. It is based on distance travelled, so slow scrolling means slow walking and it reverses correctly.
- Drops use jump then fall, and a crouch for the first 3 px after landing.
- Steep ramps use a new **slide** pose.
- Stairs use run frames with a bob.
- **No ladders:** the sprite has no back view.
- He faces the direction he is moving (path direction × `dir`), and faces forward after 200 ms without scrolling.

**Why actions follow the scrollbar rather than playing once on a timer:** they stay deterministic and reversible, nothing moves when you aren't scrolling (better for motion sickness), and the state never depends on history.

### 2.5 Drawing the path

- **Inside a scene:** the stop draws the wide part of the path with `kit.drawPath`, so it matches the connectors (8 game px wide, same colours, ink outline).
- **Between stops:** the engine draws a vertical connector from the exit at the bottom-centre of scene N to the entrance at the top-centre of scene N+1.
  - On desktop it switches back and forth inside the centre lane (`--lane`), with a ramp, stairs or a ledge chosen by stop index.
  - On phone `--lane` is 0, so it is a straight line and mostly hidden under the card.
- **One rule for every scene:** the entrance is on the top edge and the exit on the bottom edge, both within ±8 px of the centre. That makes connecting scenes trivial.
- **The intro is centred like every other scene**, so no L-shaped route is needed.

### 2.6 Drawing and handing off the hero

- **During a stop's dwell window,** the engine hides `.tl-hero` and draws him into that scene's canvas when the stop calls `f.drawHero()`. Stops therefore control what is in front of and behind him (desks, props in his hand).
- **Between stops,** the element is shown and moved with `transform: translate3d`. It is only redrawn when his pose, frame or facing changes.
- **Frame sizes are always read from the sprite frames** (`fr.w`, `fr.h`, `fr.ox`, `fr.oy`), never hard-coded. That rules out the 16×24 bug in page-fx.

### 2.7 Coordinator constraints 2 and 3: reusing the game's set pieces

**Copy the art; don't import it.**

- Theme files register themselves into global registries, export nothing, keep their helpers private, and pull in the whole game.
- Set pieces need a `level` object, tick-based fields (`this.t`, `fill`) and the game's 216 px backdrops.
- A fake level would be fragile and would bring back hidden state, which breaks reversibility.

Stop builders should read the merged `js/themes/<node>.js` files as **reference** and copy draw code into their stop file. While doing that, they turn per-tick fields into functions of `f.act` and `f.hold`. Example: the ORNL bridge's `fill` becomes `fill = ease.outCubic(f.act)`.

---

## 3. Plug-in API for stops

### 3.1 HTML structure (fixed by S2, read by S1)

```html
<main class="resume" id="resume" tabindex="-1">
  <header class="resume__head stop stop--intro" id="top" data-stop="intro" data-node="home">
    <div data-fact="p-name">…h1, tagline…</div>
    <ul class="resume__contact" id="contact-links">c-email, c-linkedin, c-github</ul>
    <p class="resume__open" data-fact="c-open">…</p>
    <div class="stop__scene" aria-hidden="true"></div>
  </header>
  <section class="timeline" id="timeline" aria-labelledby="h-timeline">
    <h2 id="h-timeline">Timeline <span>newest first</span></h2>
    <h2 class="print-h" data-group="experience">Experience</h2>   <!-- print-only; 3 of these -->
    <article class="entry stop" id="vincio" data-stop="vincio" data-node="vincio"
             data-group="projects" data-kicker="Project · Vincio">
      <div class="stop__scene" aria-hidden="true"></div>
      <div class="stop__card">
        <header class="entry__head" data-fact="p-vincio">h3 · role · meta with <time></header>
        <ul class="entry__list" id="vincio-list">
          <li data-fact="p-vincio-1">lead bullet</li>
          <li data-fact="p-vincio-2" class="is-more">…</li>
        </ul>
      </div>
    </article>
    …
  </section>
  <section class="resume__section stop" id="skills" data-stop="skills" data-node="tree">…</section>
  <section class="resume__section stop" id="contact" data-stop="contact" data-node="lighthouse">…</section>
  <footer class="resume__foot">… <a class="js-only" href="#play">Play the game</a></footer>
</main>
```

| Stop (`data-stop`, file name) | DOM id | `data-node` | Facts it claims |
|---|---|---|---|
| intro | top | home | p-name, c-email, c-linkedin, c-github, c-open (5) |
| vincio | vincio | vincio | p-vincio, -1, -2, -3 (4) |
| ornl | ornl | ornl | x-ornl, -1 … -4 (5) |
| handshake | handshake | handshake | x-hs, -1, -2, -3 (4) |
| droid | droid | droid | a-droid, a-droid-build (2) |
| neu | neu | neu | e-neu, e-neu-courses (2) |
| dhs | dhs | dhs | e-dhs (1) |
| edulearn | edulearn | **dhs** | a-edulearn (1), split out of the Dublin High article into its own `<article>` |
| trading | trading | trading | p-trade, -1 … -4 (5) |
| skills | skills | tree | s-lang, s-data, s-ml, s-web, s-tools (5) |
| contact | contact | lighthouse | none: the links are copies made by JS, with no `data-fact` |

That is all 34 facts. The `<ul>` of contact links that was `#contact` is renamed `#contact-links`.

### 3.2 A stop module

```js
// js/timeline/stops/ornl.js  (one owner; imports only from the allowlist)
import { pose, drawPath, sky, STD } from '../kit.js';
export default {
  id: 'ornl',                                   // == data-stop == file name
  facts: ['x-ornl','x-ornl-1','x-ornl-2','x-ornl-3','x-ornl-4'],
  // split: [0.15, 0.55, 0.85],                 // optional phase override
  poses() { return { type: [pose({ torso: TYPE_A }), pose({ torso: TYPE_B })] }; }, // local names
  build({ w, h, el }) {                         // once per width; pure; el = the article (read-only)
    /* draw the static backdrop + widened path into back */
    return { back, route: { enter:[w/2,0], via:[[…]], act:[x,72], exit:[w/2,h] }, /* any cached data */ };
  },
  draw(ctx, f, built) {                         // pure in (f, built); never keeps state between calls
    ctx.drawImage(built.back, 0, 0);
    /* props as functions of f.act / f.hold / f.t */
    f.drawHero();                               // where he sits in the layer order (engine draws him on top if omitted)
    /* front props */
  },
  hero(f, built) {                              // act/hold phases only; null → idle at route.act
    return { pose: 'type', frame: (f.t / 250 | 0) % 2, x: built.desk, y: 72, facing: 1 };
  },
};
```

What the engine passes in `f`:
- `p` (0–1)
- `phase`: `before | in | act | hold | out | after`
- `act`: 0–1, and 1 after the action
- `hold`: 0–1
- `t`: idle clock in ms; always 0 under reduced motion and in the checks
- `reduced`, `w`, `h`, `drawHero`

The engine handles the walk in and out along `route`.

**Poses and props:**
- **Poses** are made with `kit.pose({ head, torso, legs })`. Each part is a name from hero.js or custom rows written with hero.js's `LEGEND` (head 9 rows, torso 6, legs 7, 14 wide); the engine outlines them into 18×26 frames.
  - Shared poses in `STD`: idle, blink, run[0–3], jump, fall, crouch, victory, slide, wave, point, type, carry.
  - Pose names are local to the module; no prefixes needed.
- **Props** are drawn by the stop itself: static ones in `back`, moving ones in `draw`.
  - Props in his hand use `kit.handAt(poseName, frame, facing)`. A custom pose declares its own `hand: [x, y]`.

**What a stop file may import:**
- **Allowed:** `../kit.js`, `../../art/palette.js`, `../../art/sprite.js`, `../../art/draw.js`, `../../engine/util.js`
- **Banned:** anything in `js/game`, `js/themes`, `js/ui`, and `font.js`
- The verification checklist includes a grep for this.

### 3.3 How to avoid the name collisions we hit last time

1. **There are no string registries for stops.**
   - S1 creates `js/timeline/stops/index.js` once, with all 11 ids mapped to dynamic imports, and nobody edits it after that.
   - Each stub file starts as `export default placeholder('ornl', [...facts])`, so the site works end to end from day one.
2. **A stop builder's whole footprint** is `js/timeline/stops/<id>.js` plus their own `docs/questions-stops-<group>.md`.
   - They make no edits to `kit.js`, `palette.js`, `hero.js`, `index.html` or CSS.
   - Requests for the kit or the markup go into the questions doc. S1 or S2 makes only additive changes.
3. **One-off colours** are `'#hex'` values (quantized by `col()`) or local constant arrays. Never add a palette ramp.
4. **Each stop is wrapped in try/catch.** A stop that fails to load or throws falls back to the placeholder and logs `[timeline] stop "x" failed`. It never takes the page down.

### 3.4 Debug checks (`?debug=1`) and the stop test page

**`validate.js` reports:**
- The `[data-stop]` elements in the page match the stop list one-to-one and in the same order.
- Every one of the 34 facts is claimed by exactly one stop, and sits inside that stop's article.
- `route` points are inside the scene, the entrance is on the top edge, the exit is on the bottom edge, and both are near the centre.
- `build` and `draw` don't throw at widths 160 and 240, at p = 0, 0.1 … 1, with reduced motion on and off.
- **Determinism:** the canvas hash is identical at p = 0.37 → 0.9 → 0.37 (with t = 0).
- No canvas text is drawn.

**`tools/stop.html?stop=ornl`** shows one stop with:
- a width slider from 160 to 240
- a slider for p
- reduced-motion and phone/desktop scale toggles
- the determinism check

This page is how three builders can work at the same time without needing the full page.

---

## 4. Integration with the page-view branch

| What | Decision |
|---|---|
| `js/ui/page.js` view state machine (`wanted`, `show`, `hide`, `go`, `sync`, `reveal`) | **Keep** (coordinator point 5). Change it to `createPage({ timeline, loadGame, defaultView })`. `show()` calls `timeline.start()` and re-measures the layout. `hide()` waits for `loadGame()`, then resumes the game. The id map becomes `{home:'top', lighthouse:'contact', tree:'skills'}` |
| `#play`, `?play`, `?level=`, section links like `#ornl` | Keep |
| Bar | Keep, rewritten as **static HTML**: Shrey's pixel head plus name, a "Jump to" menu (native `popover`), and Résumé PDF. **Drop the Website \| Game switch** |
| Snapshot `<dl>` from `[data-snap]` | Keep, in the intro (built by `js/ui/cards.js`) |
| "By the numbers" band | **Drop.** Its figures now appear as highlight chips on the stop they belong to. A second copy above the fold costs phone space |
| Split hero, island-map half, map pins, round portrait | **Replace** with the intro stop (text block and a home scene) |
| Landmark crops and pop-ins | **Drop.** Superseded by the scenes, and they import the game's level list (which pulls in the whole game) for captions |
| Scroll-progress runner | **Drop.** It would put a second Shrey on screen, and it has the 16×24 frame bug |
| Contact block at the end | Keep as the Contact stop's card (cloned links) |
| Print stylesheet | Keep and extend (section 6) |
| Résumé dialog in the game (paper look, found markers) | Keep. Update its CSS for the new markup, and fix critique P0-6 (rings overlapping the contact links) |
| `▶ Play this level` buttons that `resume.js` inserts | Hidden on the website (`body > .resume .play-chip {display:none}`), still shown in the dialog |
| Deleted files | `js/ui/page-art.js`, `js/ui/page-fx.js`, `css/page.css` |

**How the game keeps working behind `#play`:**
- `boot.js` becomes a small router: it builds the timeline, creates `page.js`, and only on `#play` runs `import('./game/start.js')`. That file holds today's `boot.js` game setup, moved over unchanged.
- The head script's 8-second fallback checks for `app-ready` instead of `game-ready`.
- The title screen's and rotate card's "View as website" links go to `#page`.
- **When the résumé dialog takes `<main>`,** the timeline is already stopped. The track and scenes are hidden in the dialog by CSS. When `<main>` comes back, `show()` re-measures the layout.

---

## 5. Layout

**Highlight cards** (Shrey's decision 1, built by S2 in `js/ui/cards.js`):
- **Each card shows:** the title, the dates (from `<time>`), the **strongest bullet first** in the list, highlight chips, and a **"More (n)" button** with `aria-expanded` and `aria-controls`.
- **How "More" works:**
  - All bullets stay in a single `<ul>`; the hidden ones are `li.is-more`. They are hidden only when `html.js` is set and the stop isn't open.
  - So with JS off, in print, and for search engines, everything is shown.
  - The button is created by JS. Stops with nothing hidden get no button.
- **Why not `<details>`:** a closed `<details>` hides its content with JS off and in print, which breaks the "everything stays in the DOM" rule.
- **Chips** are built from `[data-stat], [data-chip]` inside the stop. A chip is visible text plus at most a short attribute suffix, e.g. `<span data-stat=… data-chip="win rate">43%</span>` becomes "43% win rate". They are hidden in print.
- **Proposed lead bullets:** Vincio -1, ORNL -1, Handshake -2 (moved to first), Trading -1. Shrey confirms.
- **Proposed chips:** 43% win rate, 2.76 profit factor, $50K simulated portfolio, 1st place (Droid), 1st of 700+. ORNL, Vincio and Handshake would get one or two `data-chip` marks on phrases already in their text (proposal for Shrey).

| | Desktop ≥ 1000 | Tablet 768–999 | Phone < 768 (main case) |
|---|---|---|---|
| Game pixel size | 3 CSS px | 2.5 | 2 |
| Scene | 720×300, centred on the centre line | 600×250, centred | Edge to edge, 375×200 |
| Card | **Under the scene, alternating left and right of a 120 px centre lane**, width `(W−lane−gaps)/2` (384–480) | Centred under the scene, 600 | Full width minus 16 px margins |
| Path between stops | Runs down the centre lane beside the card; the hero is always visible | Passes **under** the card | Passes **under** the card: short path stubs show above and below it, he walks in under its top edge and comes out at the next scene |
| Year markers | On the opposite side of the lane, generated from `<time>`, `aria-hidden` | Small label above the card | Small label above the card |
| Navigation | Bar: Jump to · Skills · Contact · Résumé PDF | Bar: Jump menu | Bar: name and Menu (Jump list, Résumé PDF, Play the game) |

**10-second scan:**
- The first screen at both 375×812 and 1280×800 must show:
  - name
  - one-line role
  - email, LinkedIn and GitHub buttons (44 px tall)
  - open-to-work line
  - the hero at his door
- Phone order: text, scene, snapshot. Desktop: text, snapshot, scene.
- The skip link becomes "Skip to timeline". The Jump menu lists every stop with its year.
- "Play the game" appears only in the footer and in the Menu.

---

## 6. Accessibility, reduced motion, JS off, print

- **Hidden from screen readers:** `.tl-track`, `.tl-hero` and every `.stop__scene` are `aria-hidden`. The scenes only illustrate what the card already says, so there is no alt text and nothing is read twice.
- **Reading order is the page order:** DOM order equals chronological order. On desktop the cards alternate sides only visually.
- **Headings and dates:** h1 for the name, h2 for Timeline, Skills and Contact, h3 for each stop. Dates use `<time>`.
- **Text never animates.** There are no fade-ins on scroll; only canvases move.
- **No scroll-jacking:** no `preventDefault` on wheel or touch, no scroll-snap, no pinning. Smooth scrolling only under `prefers-reduced-motion: no-preference`, and only when a link is clicked.
- **Reduced motion:**
  - Nothing follows the scrollbar and nothing loops.
  - Every scene shows its finished state.
  - The hero appears only at the **current** stop (the scene closest to the focus line), standing in his finished pose. He moves instantly when the current stop changes; at most a 150 ms opacity fade.
  - The engine listens for changes to the reduced-motion setting.
- **JS off or opened from `file://`:**
  - The whole résumé, in timeline order, with all bullets showing.
  - Scene boxes are `display:none`, so there are no gaps.
  - The bar stays usable (the `popover` menu needs no JS). Résumé PDF and Play are hidden.
- **Print:**
  - Black on white. The bar, scenes, track, hero, chips, "More" buttons and Play link are hidden.
  - In print only, `.timeline` becomes a flex column. CSS `order` regroups the stops under the three print-only headings: Experience (ORNL, Handshake), Projects (Vincio, Trading), Education & honors (Northeastern, Droid, Dublin High, EduLearn). Skills follows.
  - Entries never split across pages. The contact line stays at the top, and there is no phone number.

---

## 7. Performance budget

- **First paint is just HTML and CSS.** Module scripts are deferred, and scene boxes are reserved by CSS, so JS causes no layout shift.
  - Target: the name (the largest element) painted in under 1.5 s on a 4G phone.
  - Optional: self-host Fredoka and Atkinson as subset woff2 to save a cross-origin round trip.
- **JS on the landing page:** engine, art, kit and 11 stops at **≤ 60 KB gzip**.
  - **Zero requests** to `js/game/**` (except `content.js`) or `js/themes/**` until `#play`.
  - The intro stop loads first; the other stops are imported dynamically after the first frame.
- **Scene backdrops are built lazily,** when a scene comes within 1.5 screen heights, and cached per stop and width. Each takes ≤ 4 ms at 240 px wide.
- **Per scroll frame:**
  - One read of `scrollY`, then the pure sample, then writes only: the hero's transform plus a redraw of the active scene (≤ 1 ms at game-pixel size).
  - **≤ 2 ms of script per frame, no forced layout.**
  - All geometry is cached when the layout is measured, in one batch of reads followed by one batch of writes.
- **Only render while something changes:**
  - Scroll and resize events schedule a single animation frame.
  - Off-screen scenes are never drawn (IntersectionObserver).
  - Inactive scenes are drawn once when they switch between "before" and "after".
  - The idle loop runs at most 8 fps, only for the active, visible scene in its hold phase. Zero CPU when the tab is hidden.

---

## 8. Files and owners

| File | Owner |
|---|---|
| `js/timeline/index.js` (`createTimeline({root, reduced, debug})` → `start`, `stop`, `relayout`) | S1 |
| `js/timeline/layout.js` (measuring, scale, dwell windows, routes), `scroll.js` (pure `sample`), `render.js` (scheduler, canvases, hero element), `hero.js` (walk poses) | S1 |
| `js/timeline/api.js` (defaults, phase split), `kit.js`, `poses.js`, `validate.js` | S1 |
| `js/timeline/stops/index.js` (frozen list), `stops/_placeholder.js` | S1 |
| `js/art/sprites/hero.js`: export the part arrays and `build` only (additive; no branch touches this file) | S1 |
| `css/track.css` (track, hero, canvas rendering, layer order) | S1 |
| `tools/stop.html`, `tools/stop.js` (stop test page), `docs/BUILDING-STOPS.md` | S1 |
| `index.html` (restructure, static bar, `<time>`, `.is-more`, `data-chip`, splitting EduLearn out, print headings, meta and og tags) | S2 |
| `css/base.css`, `css/resume.css` (JS-off, print, dialog), `css/timeline.css` (new; layouts, cards, bar, intro, `--gp`, `--scene-h`, `--lane`) | S2 |
| `js/boot.js`, `js/ui/page.js`, `js/ui/cards.js` (new), `js/game/start.js` (moved game setup), `js/ui/resume.js` (play buttons, id map), README | S2 |
| Delete `css/page.css`, `js/ui/page-art.js`, `js/ui/page-fx.js` | S2 |
| `stops/vincio.js`, `ornl.js`, `handshake.js` and `docs/questions-stops-work.md` | S3 |
| `stops/droid.js`, `neu.js`, `dhs.js`, `edulearn.js` and `docs/questions-stops-school.md` | S4 |
| `stops/intro.js`, `trading.js`, `skills.js`, `contact.js` and `docs/questions-stops-ends.md` | S5 |
| `docs/critique-timeline.md` | S6 |

**What each scene shows** (one claim, at most two beats, and a clear before and after state; any count is read from `el`):

| Stop | Builder | Scene |
|---|---|---|
| intro | S5 | He steps out of his house among golden Tri-Valley hills, shoulders his backpack and heads to the start of the path |
| vincio | S3 | He feeds in a script page. Three agent drones (film strip, shape, text-bar icons) pull scattered clips into a timeline track; the preview monitor plays the cut |
| ornl | S3 | Beads drift, graph edges light up and they snap into a polymer chain; then a browser RUN bar fills while GPU rack lights pulse together. He is typing |
| handshake | S3 | He stamps ✓/✗ on image cards on a conveyor; a noisy image cleans up as his ratings feed in |
| droid | S4 | He speaks into an Omi pendant (waveform bubble, no words); a robot advances through smoke and puts a fire out; he lifts a trophy |
| neu | S4 | A tram drops him at a brick campus arch; 7 textbooks (counted from `data-credit`) stack into steps; a faint dashed path runs on toward 2029 |
| dhs | S4 | He crosses a stage in school colours, takes his diploma and tosses his cap |
| edulearn | S4 | A video-call grid of 700 one-pixel tiles; his tile lights up and rises to a podium |
| trading | S5 | Candles act as platforms. 7 trades: 3 wins (43%) whose total is 2.76× the 4 losses, so the bars match the stats. Walk-forward brackets slide and the equity line climbs |
| skills | S5 | He opens his backpack; 38 tokens fly into five pockets (6/6/8/10/8, counted from `data-skill`) |
| contact | S5 | The path ends at a beacon, matching the game's Lighthouse. He lights it and the beam sweeps (the sweep is the idle loop) |

---

## 9. Work breakdown, order and merging

Each session works in its own git worktree under `.claude/worktrees/`, on a branch cut from `timeline`.

1. **Integrator (step 0, done in order):**
   - Merge the four level branches and the page-view branch into `game-v2`.
   - Check after the merge: the LinkedIn link, the `c-open` flag removal from the finale branch, the critique P0-6 fix after page-view.
   - Run `?debug=1`: coverage 34/34 with 0 missing, plus a quick play test.
   - Tag `pre-timeline` and cut the `timeline` branch. **No session starts before this.**
2. **Phase 1, in parallel:**
   - **S1 (engine).** Its first milestone, **M1 (API freeze)**: api, kit, poses, hero.js exports, the stop list with 11 placeholders, the stop test page, `BUILDING-STOPS.md`, and the iOS crispness check. M1 is merged into `timeline` first and quickly.
   - **S2 (page shell).** Starts immediately against the HTML structure in §3.1: markup, CSS for 3 breakpoints, cards, router, lazy game, print, dialog.
3. **Phase 2:**
   - **S3, S4 and S5 branch after M1** and build in the stop test page.
   - **S1 continues to M2:** the full-page engine, reduced motion, debug overlay and performance.
   - **S2 finishes its own M2.**
   - Merge S2 then S1 into `timeline` (their files don't overlap). The integrator checks the full page with placeholder stops.
   - Builders then `git merge timeline` to test on the real page. Each merges back when done; files don't overlap, so there are no conflicts.
   - Changes to the stop API after M1 must only add things and stay backward compatible.
4. **Phase 3:**
   - **S6 (critic)** runs §10 on `timeline` and writes findings with an owner each. Owners fix on short branches; S6 re-checks.
5. **Preview gate (Shrey's decision 2):**
   - The integrator serves `timeline` locally with `python3 tools/serve.py 4173`. It listens on all network interfaces, so Shrey's phone on the same Wi-Fi can open `http://<mac-ip>:4173`.
   - Shrey reviews on desktop and on his phone.
   - **Only after he approves:** merge `timeline` into `game-v2`, then into `main`, push, and check the live URL. GitHub Pages caches modules for about 10 minutes, so give it time.
   - Nothing reaches `main` before that.

---

## 10. Verification checklist

**Desktop 1280×800 (DPR 1 and 2)**
- [ ] The first screen shows name, role, contacts, open-to-work, Jump menu and PDF button, with no horizontal scroll.
- [ ] The hero is visible on load. Scrolling down, he walks, jumps and slides down the centre lane, and at each scene walks in, acts, holds and walks out.
- [ ] Scrolling back up reverses everything exactly: `__tl.hash()` matches at the same scroll position.
- [ ] Only one hero on screen. The path never touches card text. Cards alternate sides.
- [ ] `/#ornl` lands below the bar.
- [ ] Performance trace of a 5-second fling: no task over 16 ms, ≤ 2 ms script per frame, no forced reflow. Zero animation frames when idle (outside the hold loop).
- [ ] No requests to `js/game/**` or `js/themes/**`.

**Phone 375×812 (DPR 3, emulated, plus a real iPhone in Safari)**
- [ ] The first screen shows name, tagline, contact buttons, open-to-work and part of the home scene. No overflow at 320 px wide.
- [ ] Text ≥ 16 px and tap targets ≥ 44 px.
- [ ] Scenes are crisp (zoomed screenshot shows square pixels).
- [ ] The hero goes under cards and comes out at the next scene. During a momentum fling, scenes and path stay attached to their cards.
- [ ] The address bar showing and hiding causes no jumps.
- [ ] "More" opens and closes, the layout re-measures, and the hero ends up in the right place.

**Reduced motion**
- [ ] No walking or scroll-following; every scene shows its finished state.
- [ ] The hero appears only at the current stop and moves instantly.
- [ ] No idle loops (CPU idle). Link jumps don't smooth-scroll.

**JS off or `file://`**
- [ ] All 34 facts in timeline order, every bullet showing.
- [ ] No empty scene gaps. No PDF or Play buttons. The skip link and Jump menu work.

**Print (Chrome and Safari, Letter and A4)**
- [ ] Grouped into Experience / Projects / Education & honors / Skills.
- [ ] Contacts at the top, no phone number, no scenes or chips.
- [ ] Hidden bullets are printed. Entries stay whole. 1–2 pages.

**`#play`**
- [ ] Game modules are fetched only now.
- [ ] Play a level. The résumé dialog (R) is readable, and the found markers don't overlap the contact links.
- [ ] "View as website" returns to the timeline correctly laid out, including after resizing while in the game.
- [ ] Back and Forward switch between the two views. `?level=ornl` works. A portrait phone shows the rotate card with "View as website" as the main button.

**Debug and code checks**
- [ ] `?debug=1` prints `timeline check: 11 stops OK, 34/34 facts, 0 duplicates, determinism OK`.
- [ ] Zero console errors.
- [ ] `grep '^import' js/timeline/stops/*.js` shows only allowed paths.

---

## 11. Risks

1. **The hero lags during iOS momentum scrolling.** Keeping him in page coordinates limits this to "slightly behind on the path". Test on a real device during M1.
2. **Stale measurements** after fonts load, "More" toggles or returning from the game. Covered by the ResizeObserver, `fonts.ready` and re-measuring in `show()`; nothing viewport-relative is cached.
3. **The hero hidden under cards on phone might look like a bug.** The visible path stubs make it read as a trail going under a signboard. S6 judges it. Fallback: a left-rail variant (narrower cards).
4. **160 px scenes are cramped.** Builders design for 160 first, the stop test page enforces it, and each scene makes one claim.
5. **Scenes from three builders may not match.** The shared path, ground and sky in the kit, the same height for all scenes, and S6's review address this.
6. **Restructuring the HTML could affect the game.** For example, `a-edulearn` gets a new kicker on its game card, and the `▶ Play this level` buttons now appear twice for Dublin High (Dublin High and EduLearn both use `data-node="dhs"`). Run the coverage report and play the Dublin High level after S2.
7. **Regrouping by flex `order` in print may break pages oddly in some browsers.** Fallback: a JS `beforeprint`/`afterprint` regroup, or accept chronological order in print.
8. **Mixed old and new modules from GitHub Pages' cache** right after deploy. Deploy once, after approval.
9. **Facts that still need Shrey:** Northeastern's start month, lead bullets, chip marks, and the Droid/Northeastern swap.

**Questions for Shrey, gathered by the integrator before Phase 2:**
- The Droid/Northeastern swap
- "Sep 2025"
- The lead bullets
- The `data-chip` phrases
- Beacon or mailbox for Contact

### Critical Files for Implementation
- /Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/page-view-c30408/index.html
- /Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/page-view-c30408/js/ui/page.js
- /Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/page-view-c30408/js/boot.js
- /Users/shreyvalia/Desktop/personal portfolio/js/art/sprites/hero.js
- /Users/shreyvalia/Desktop/personal portfolio/js/engine/display.js
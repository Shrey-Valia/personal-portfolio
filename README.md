# Shrey Valia: portfolio

A scroll timeline of Shrey's work, newest first. As you scroll, his pixel
character walks a path down the page; at each stop the path widens into a
small scene where he acts out that line of the résumé, with the card
underneath. The same résumé is also a 16-bit platformer, one link away
(`#play`): walk the overworld map ("Shrey Island"), enter a place, log facts,
stomp bugs, reach the SHIP-IT button.

No framework, no build step, no third-party JavaScript. The engine is
hand-written Canvas2D, every sprite is drawn in code, and the sound is
synthesized with WebAudio.

## Run it locally

ES modules don't load from `file://`, so serve the folder:

```bash
python3 tools/serve.py 4173
```

Then open http://localhost:4173. Plain `python3 -m http.server 4173` works
too, but it lets the browser cache modules between edits.

Opened from `file://`, or with JavaScript off, the page is the full text
résumé in the same order, every bullet showing. Print (or the "Résumé PDF"
button) gives a two-page résumé grouped under Experience, Projects and
Education & honors. Nothing is lost either way.

The landing page never downloads the game: `js/boot.js` imports
`js/game/start.js` only when someone opens `#play`, `?play` or `?level=`.

## Status

- **Website:** the timeline engine, page shell, print and reduced motion are
  built. The 11 stop scenes start as placeholders; each is one file in
  `js/timeline/stops/` (contract: `docs/BUILDING-STOPS.md`, plan:
  `docs/TIMELINE-SCENES.md`).
- **Game:** every level is playable.

## Editing content

**`index.html` is the only content source**, written in timeline order.
Every fact is an element with `data-fact="id"`. Stops, levels and fact cards
all read those. To change wording, edit the HTML; the site and the game pick
it up.

- `data-stop`: one per timeline stop, in the order of `js/timeline/stops/index.js`.
- `li.is-more`: bullets behind a stop's "More" button (always shown without JS and in print).
- `data-chip`: a figure shown as a highlight chip (its text plus the attribute's suffix).
- `data-snap`: a quick fact in the intro's snapshot.
- `data-group`: where print regroups a stop (experience, projects, education).
- `data-title`, `data-kicker`: the game card's heading and the line above it.
- `data-node`: which map node a section belongs to (the "Play this level" chips).
- `data-skill` / `data-credit`: list items that become Tech Tree bricks and lecture-hall textbooks.

Run with `?debug=1` and the console prints `timeline check: 11 stops OK,
34/34 facts…` (and, in the game, the level coverage report).

## Debug flags

| Flag | Effect |
|---|---|
| `?debug=1` | Timeline checks, `window.__tl` (`goto(id, p)`, `drawNow({ dir, still, t })` with `t` pinning the idle clock, `hash()`, `setReduced()`); in the game an FPS counter, coverage report and `window.__game` |
| `tools/stop.html?stop=ornl` | The stop test bench: one stop with width, p and reduced-motion controls and the checks |
| `?level=ornl` | Boot straight into a level |
| `?fresh=1` | Ignore saved progress for this load |
| `?god=1` | No damage, no pit deaths |

## Layout

```
index.html        résumé (content source, timeline order) + bar + game shell + dialogs
css/              base.css (tokens, js/no-js switch) · resume.css (page, print, dialog)
                  · timeline.css (website layout) · track.css (pixel layers) · game.css
js/boot.js        the router: the timeline, or the game on demand
js/timeline/      the timeline engine, its stop API and kit, and stops/ (one file per stop)
js/game/start.js  the game's boot, loaded only for #play
js/engine/        loop, display (integer scaling), input + touch, tilemap,
                  physics, camera, particles, audio, save
js/art/           palette, sprite compiler, bitmap font, tiles, backdrops, map art
js/game/          game, hero, objects, enemies, set pieces, map graph,
                  scenes/ (overworld, level), levels/ (one file per level)
js/ui/            page (views and URL), cards (More, chips, snapshot), hud, dialogs, résumé dialog
tools/            serve.py (no-cache dev server), stop.html (stop test bench)
```

Adding a level: write `js/game/levels/<node>.js` (ASCII rooms plus fact ids)
and register it in `js/game/levels/index.js`. The map node lights up
automatically.

## Before you publish

1. Your phone number is deliberately not on the site. Don't host the résumé
   PDF here unless you remove it from that file first.

## Deploy

The repo is `Shrey-Valia/personal-portfolio`. GitHub Pages serves `main`
from the root at https://shrey-valia.github.io/personal-portfolio/, so
**every push to `main` goes live.** All paths are relative, so the
`/personal-portfolio/` subpath works as-is (`.nojekyll` is already there).

Filenames are all lowercase because Pages is case-sensitive and macOS isn't.

## Design notes

- **Original art only.** Mario-inspired mechanics, nothing copied: info
  blocks with a `>_` prompt instead of `?` blocks, gunmetal ports instead of
  green pipes, coffee instead of mushrooms, commit flags as checkpoints, a
  SHIP-IT button as the goal, and enemies that are software bugs.
- **Each level depicts its work.** In Oak Ridge Lab, polymer beads
  self-assemble into bridges as you approach. A RUN progress bar becomes a
  bridge. In Inverse Design you hit the block at TARGET PROPERTIES and the
  design-input sliders rise into stairs. Four GPU lifts move in lockstep.
- **Fair lives.** Each life starts with a coffee shield. Only pits kill
  instantly. Checkpoints are frequent. Game over sends you back to the map
  with every fact kept. Assist mode and level skip are in the pause menu.
- **Readable.** Fact text is always real DOM text, never only canvas pixels;
  the website's scenes draw no text at all.
  Dialogs are native `<dialog>`. Reduced motion turns off shake and parallax.
  Sound is off by default.

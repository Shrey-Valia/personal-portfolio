# Shrey Valia: a playable résumé

A 16-bit platformer you play to learn about Shrey. Walk the overworld map
("Shrey Island"), enter a place, hit `>_` blocks from below to log facts, take
ports down into side rooms, stomp bugs, reach the SHIP-IT button.

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

Opened from `file://`, or with JavaScript off, the page shows the full text
résumé instead of the game. Nothing is lost either way.

## Status

| Built | Coming next |
|---|---|
| Engine, art pipeline, HUD, cards, résumé dialog, save, touch controls, sound | Vincio Studio, Trading Floor, Label Factory (Handshake), Droid Strike Back, Dublin High, Northeastern, Tech Tree, Lighthouse |
| **Home** (tutorial) and **Oak Ridge Lab** (flagship level + Inverse Design room) | |
| Overworld with every node, unlock rules and path reveals | |

Nodes without a level yet open their résumé section when entered.

## Editing content

**`index.html` is the only content source.** Every fact is an element
with `data-fact="id"`. Levels reference those ids; fact cards clone the
element. To change wording, edit the HTML. The game picks it up.

- `data-title`: the card heading.
- `data-kicker` on an `<article>`: the line above every card from it.
- `data-node`: which map node a section belongs to (powers the "Play this level" chips).
- `data-skill` / `data-credit`: list items that become Tech Tree bricks and lecture-hall textbooks.

Run with `?debug=1` and the console prints a coverage report: how many facts
have a home in some level, and any level reference with no matching fact.

## Debug flags

| Flag | Effect |
|---|---|
| `?debug=1` | FPS counter, coverage report, `window.__game` for stepping frames |
| `?level=ornl` | Boot straight into a level |
| `?fresh=1` | Ignore saved progress for this load |
| `?god=1` | No damage, no pit deaths |

## Layout

```
index.html        résumé (content source) + game shell + dialogs
css/              base.css (tokens, js/no-js switch) · resume.css · game.css
js/boot.js        entry; falls back to the résumé on any error
js/engine/        loop, display (integer scaling), input + touch, tilemap,
                  physics, camera, particles, audio, save
js/art/           palette, sprite compiler, bitmap font, tiles, backdrops, map art
js/game/          game, hero, objects, enemies, set pieces, map graph,
                  scenes/ (overworld, level), levels/ (one file per level)
js/ui/            hud, dialogs (cards, pause, tally, game over), résumé dialog
```

Adding a level: write `js/game/levels/<node>.js` (ASCII rooms plus fact ids)
and register it in `js/game/levels/index.js`. The map node lights up
automatically.

## Before you publish

1. **Confirm the LinkedIn URL.** The site links `linkedin.com/in/shrey-valia`
   (from the résumé). You've also used `linkedin.com/in/shrey-valia-7a0041267`.
   Open the short one and make sure it resolves.
2. **"Open to summer 2027 internships"** is inferred from your class year,
   not stated on the résumé. It's marked `data-flag="inference"` in
   `index.html`. Change or delete it.
3. Your phone number is deliberately not on the site. Don't host the résumé
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
- **Readable.** Fact text is always real DOM text, never only canvas pixels.
  Dialogs are native `<dialog>`. Reduced motion turns off shake and parallax.
  Sound is off by default.

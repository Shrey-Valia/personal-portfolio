# Questions and requests: the bookend stops (intro, skills, contact)

Files: `js/timeline/stops/intro.js` (with T0), `skills.js` (with T9 and
`tierIcons()`), `contact.js`. Bench checks pass for all three (widths 160 and
240, p sweep, reduced motion, determinism, no canvas text, transits). On
`/?debug=1` the page logs `timeline check: 11 stops OK`, with 0 console errors at
1280×800 and 375×812, and scrolling down then back up redraws identical pixels
at every point checked. Build time at 240 px: intro 1 ms, skills 3–4 ms,
contact 1 ms. Every draw is ≤ 0.2 ms.

## For the engine owner (timeline-core)

1. **`transitRuntime.build` drops `lane`.** In `api.js`, the call at
   line 194 destructures `{ w, h, from, to, side }` and passes on
   `{ w, h, dy, from, to, side }`, so transits never see the lane that
   `index.js` hands in. Fix: add `lane = 0` to the destructuring and pass it
   through. T0 depends on it. With lane > 0 (desktop), the three clips sit in
   the open strip under the intro scene, above the Timeline title. With
   lane 0 (phones and tablets), they sit in the last 21 px above Vincio. Until
   the fix, desktop gets the phone layout, and the title band hides him from
   the waist up while he hops the clips. (Sent to the coordinator.)
2. **The last stop ends in `out`, not `hold`.** `layout.js` sets
   `last.p1 = endP = split[2]`, so at the end of Contact's window, and over the
   whole footer below it, p equals split[2] exactly. `frame()` reads that as
   phase `out` with walk 0, so the engine walks him (run or idle at route.act),
   `hero()` isn't asked, and the idle loop stops. In practice he stops waving
   and the beacon stops flickering just as the page ends. Fix: make p1
   `endP - 1e-6`, or have `frame()` treat p ≥ c on the last stop as hold 1.
   Contact works around it: its out walk starts with a step left, so he still
   faces the dock. (Sent to the coordinator.)
3. **Tier icons for the skills card.** `skills.js` has a named export,
   `tierIcons()`, which returns `{ 's-lang', 's-data', 's-ml', 's-web',
   's-tools' }`. Each value is a fresh 16 × 16 canvas with that tier's lit
   brick, the same art as the scene's bricks. I can't edit the markup, so
   please place them, for example in `js/ui/cards.js`:
   ```js
   import { tierIcons } from '../timeline/stops/skills.js';
   for (const [fact, c] of Object.entries(tierIcons())) {
     c.className = 'skillset__icon'; c.setAttribute('aria-hidden', 'true');
     document.querySelector(`[data-fact="${fact}"] > h3`)?.prepend(c);
   }
   ```
   Suggested CSS: `width: calc(var(--gp) * 8px)` (or a fixed 24 px),
   `image-rendering: pixelated`, `vertical-align: -5px`, `margin-right: 8px`.
   The `print` and `plain` views should hide them.
4. **The Timeline title band (68c8081) covers the centre on desktop.** The
   intro→Vincio gap on desktop is 64 game px, and `.timeline__title` is now a
   full-width page-colour band at 29–42 of it. Making it `width: fit-content`
   at ≥ 1000 px, as was done for `.year-mark`, would leave the lane clear.
   T0 already works around it (see 1). It's only a request.

## For Shrey (defaults chosen; say if you want them changed)

1. **His house floats.** The intro's room sits on a lump of the golden Tri-Valley
   hills drifting above the clouds, which echoes the game's island and suits
   "the top of the night-sky descent". A valley oak stands on a smaller lump
   in the wing. The other option is a house on the ground with the path
   starting at the porch.
2. **The intro's beats.** The page opens with him at his desk. He turns his
   chair to wave when the page loads and every 8 s, and types in between at
   4 fps on the idle clock. Scrolling makes him stand, cross to his black
   backpack by the door, pick it up, shoulder it and walk out onto the steel
   ledge. With reduced motion he's seated, waving. The poster on his wall is a
   generic sunset hill. There is no text or logo anywhere.
3. **Skills: he climbs down, he doesn't slide.** Per the brief, he climbs down
   the trunk (the scene plan said a fire-pole slide). Each band's brick pops
   and the band lights as he passes. The scene has no labels: the band names
   would cover him on phones, and the card's headings name them anyway.
4. **Contact: a hop down to the dock.** The scene's entrance is at the top
   centre, and the three lamps need the length of the dock. So he hops off the
   root ladder's planks in an arc down to the dock's far end, then walks back
   past the lamps to the lighthouse. The signs use the game's glyphs and
   colours: a gold envelope (email), a cyan card (LinkedIn) and green code
   (GitHub). The beam sweeps once as you scroll through the hold, then rests
   pointing over the harbour.
5. **The beacon has no words.** The open-to-work line is 5 words, over the
   label limit, and it's in the card anyway.

## Notes for the other builders

- T9's bottom 4 px are dock planks, so the Contact scene's top edge is where
  he steps off.
- The skills scene's taproot leaves the scene at the bottom, at centre + 8,
  where T9's ladder picks it up.
- T8 (Trading's transit) should end at the skills entrance, `[w/2 - 2, 0]`,
  on top of the crown's main line.

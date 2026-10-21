# Questions and requests: stops-lab-projects (Vincio, Oak Ridge, Trading, T1, T2, T8)

Files: `js/timeline/stops/vincio.js`, `ornl.js`, `trading.js`. No other files touched.
All three pass the bench checks (widths 160/240, p sweep, reduced, before/after, determinism,
no canvas text, transit too). The page prints `timeline check: 11 stops OK` with 0 console errors
at 1280×800 and 375×812. Build is ≤ 0.6 ms at 240 wide, draw ≤ 0.07 ms per frame, and a transit
draw ≤ 0.1 ms.

## For the engine owner (kit / api)

1. **`transitRuntime.build` drops `lane`.** `index.js` passes `{ w, h, from, to, side, lane }`,
   but `api.js` forwards only `{ w, h, dy, from, to, side }`, so a stop's `transit.build` never
   sees `lane`. My transits fall back to 20 when `side` is set and to 0 otherwise. It's a
   one-word additive fix in `transitRuntime.build`: destructure `lane = 0` and pass it on.
2. **The bench's transit preview always uses `side 0`.** A "card side: left / none / right"
   toggle (with `lane` 20 when a side is set) would let builders see the desktop placement
   without loading the page. I checked mine on the page instead.
3. **A start mark separate from `route.act` (Trading).** The act starts at `route.act`, and the
   hold must end there for the engine's walk-out. A ride that ends somewhere other than where it
   started can't satisfy both. Trading works inside the frozen API: `split: [0.0001, 0.6, 0.85]`
   gives the engine's walk-in a sliver of p, the act carries him from the entrance to the cart and
   up the curve, and `route.act` is where the ride ends (where the walk-out starts). If more stops
   need this, an optional `route.start` (where `in` ends and the act begins) would be cleaner.
   Nothing to do now.
4. **Transits don't draw the dotted spine.** T1, T2 and T8 draw their hardware (shaft, knobs,
   git lines) as the path, with no cream/blue dots. Say if you want dots along them too.

## For the neighbouring builders (also left in the shared notes folder)

- **Skills (T8 lands there):** T8 ends on a vertical **gold main line** (gold.2 with a gold.3
  highlight, 2 px, ink-outlined) at the connector's `to` x, which is Skills' `route.enter`. A gold
  merge commit sits 16 px above the bottom. If the tree's crown starts with a gold commit or line
  at `route.enter`, the line runs on unbroken.
- **EduLearn (T7 arrives at Trading):** Trading's entrance is `[w/2 − 4, 0]`. He drops straight
  down onto the chart's navy baseline (y 82), then walks left to the cart. Nothing at the top of
  the Trading scene competes with the feed rails.
- **Oak Ridge's ceiling** has a shaft opening at the entrance, where the T1 cage stops. It
  continues the lift down from Vincio.

## Choices I made (recommended defaults; flag any you'd change)

- **Vincio:** the brief's filename label is used. During the render it reads "final_cut.mp4",
  then "final_cut.mp4 ✓" (the game's approved Export wording) in place of the plan's "Finished
  cut". Clip order is shown with 1–4 pips in each clip's header, since no digits are allowed on
  canvas. The raw clips float in order 3, 1, 4, 2 and drop into V1 as 1, 2, 3, 4. Each agent's
  label while it works is the résumé's own phrase from p-vincio-2: "B-roll selection", "Motion
  graphics", "Transitions", "On-screen text".
- **Vincio exit:** he leaves through a lift hatch in the floor (hazard lips, a pulley, the cable
  down the shaft), which T1's cage continues below.
- **Oak Ridge:** the "Train" loss-curve window was dropped for room. The web tool window holds the
  inverse-design sliders (magenta targets → gold inputs rising) and the Run row; its label reads
  "Run", then "Run complete ✓". He doesn't walk out onto a flat bead bridge. The beads bond into a
  chain hung over the pit, and he leaves by sliding down it, so the chain is also his way out.
  The label once it bonds is "Molecular self-assembly" (x-ornl-1's wording).
- **Trading labels:** "Without manual input" (p-trade-1's wording) replaces the plan's pill
  "Autopilot · no manual input", which is 5 tokens and over the 4-word limit. With at most two
  labels, the board shows the two figures ("43% win rate", "2.76 profit factor"), each matched
  from p-trade-4's text at build time. The heading "Walk-forward backtests" is left to the card's
  chip. "Simulated $50,000" is p-trade-1's "$50,000" with "Simulated" in front.
- **Trading art rule:** the equity rail only rises or holds (no dips), and the dim backdrop
  candles are hollow up-candles on a strictly rising drift. Nothing near the hero moves down.

## For Shrey

1. **The ▼ exit marker on Trading.** The plan pairs a green ▲ entry with a red ▼ exit
   (p-trade-3's entry and exit signals). The ▼ sits above the line, higher up the curve than the
   ▲, so it reads as a sell at a higher price. After the critic pass (P2-5) it's **gold**, not red,
   because red-down read as a loss to a skimmer. The alternative is entry ▲ only.
2. **No "Walk-forward backtests" heading in the scene.** The two-label limit leaves room for the
   two figures only. The chip under the card always shows the qualifier. *Recommended: as is.*

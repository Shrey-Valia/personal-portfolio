# Stops: Northeastern, Dublin High, EduLearn (and T5, T6, T7)

Files: `js/timeline/stops/neu.js`, `dhs.js`, `edulearn.js`. Each stop's
`transit` carries him to the next stop: T5 (neu → dhs), T6 (dhs →
edulearn), T7 (edulearn → trading).

Checked (also after merging timeline-core 68c8081 and 0b45d40): the bench checks pass for all three (widths 160/240, p sweep,
reduced motion, before/after, determinism, no canvas text, transits). On
`/?debug=1` the console reads `timeline check: 11 stops OK, 34/34 facts`
with 0 errors. At 1280×800 and 375×812, 24 sampled scroll positions across
the three scenes and three transits draw the same pixels after scrolling
away and back. Warm `build` takes 1–3 ms at 240 px and `draw` about 0.1 ms.

## For the engine (timeline-core)

1. ~~**`lane` never reaches a transit.**~~ Fixed in timeline-core 0b45d40
   (merged here). T5 now takes `lane` straight from the engine (20 beside a
   desktop card, 0 on phones). T6 and T7 don't use it.
2. **Optional: props that ride with him off the scene.** He leaves
   Northeastern holding his book stack, and Dublin High wearing his cap
   and holding his diploma. These overlays are drawn in the scene canvas,
   so they disappear once he steps onto the track layer at the scene's
   bottom edge, just as he leaves. The glitch is hard to see. A hook such
   as `transit.overlay` or `hero.props` would fix it. Low priority.

## Decisions I took (defaults; say if you want them changed)

3. **Northeastern: he catches the books rather than hopping down them.**
   I followed the brief: "he catches one floating textbook per course".
   Seven books (one per `[data-credit]`, read from the card) float in an
   arch. Left to right, each one flies down into the stack in his arms,
   and its course name shows as an HTML label while it flies. In the hold
   the label reads "Relevant coursework", the card's own heading.
   The scene plan's staircase (hop down books 1–7 to the hall doors) also
   fights the API. `hero()` must start the act and end the hold at
   `route.act`, so an act that travels from the top of a staircase to the
   doors can't hand over to the walk-out. A stationary catch fits cleanly.
   - No start date appears anywhere. The card keeps "Expected graduation
     May 2029".
   - The snow keeps falling from the top of the scene, as he arrives
     through Droid's cloud floor. It moves with the scroll, not a timer,
     so it stops when you stop. Reduced motion shows no airborne snow.
4. **EduLearn: the podium climb is his walk in.** The same API rule
   applies: he has to finish the act where he started it. So the engine's
   walk-in (`split: [0.22, 0.58, 0.85]`, a longer in-phase) drops him onto
   the keyboard deck and hops him up 2nd, then 1st. The act then flips the
   results from "Final results" to "1st Place", rims his tile gold, sweeps
   applause (gold raised hands) across the call, floats hearts, and has him
   jump for joy on 1st. "1st Place" uses the card's own capitalisation.
   - The tile count comes from the card's "700+" (exactly 700 tiles: a
     35×22 grid minus the 14×5 results window). The hero and podium hide
     a few of them in front, so the scene never shows more than 700.
   - His tile is fixed just under the results window (brown skin, black
     shirt).
   - The "Live" badge is a red pill with a white dot and no word.
   - It has an idle loop in hold: a few tiles light green as people talk,
     at 4 fps.
5. **Dublin High.** The banner's year comes from the card's last `<time>`
   (2025), and the "Class of 2025" words are an HTML label on the red
   banner. The theme's sun disc is gone, so only the glow remains behind
   the hills. Reduced motion shows him on stage in his cap with the
   diploma raised, and the four caps resting on the stage lip.
6. **T5 hillside.** On desktop the golden slopes switch back down the free
   side, away from the card, with valley oaks and a dust trail. He slides
   to the hill's foot, drops beside the red canopy, and walks under it.
   I tried a dim hill-crest silhouette behind the slopes, but at 96 px wide
   it read as a box against the page, so I dropped it.
7. **T6 cable.** The black cable runs from the top of the gap down to a
   port out on the free side. He hangs from it facing down-cable, and
   stays facing that way when you scroll up so his hand stays on the
   cable. Then he lets go and hops into EduLearn. Cyan data pulses run
   down the cable as you scroll. The "2024" marker is the page's HTML.
8. **T7 feeds.** The cyan rail stands for Level II order flow and the gold
   rail for microstructure. As he nears each rail, its red ✕ bad ticks
   blink out, then it slides into time alignment, and the two form the
   steps he walks down. Dotted shared-timestamp lines then fill in between
   them. Every part is a function of his distance along the path, so
   scrolling up un-aligns them. The formed state is the reduced-motion
   frame.

## Questions for Shrey

9. **Do the T7 rails need words?** Transits have no `labels()` hook, so
   the rails are told apart by colour only. The trading card's p-trade-2
   bullet names both feeds. *Recommended: colour only.* Adding words would
   need a small kit addition (labels for transits).
10. **Northeastern: catch (now) or the staircase from the old plan?**
    *Recommended: keep the catch.* It matches the brief, and the API
    supports it cleanly (see 3).

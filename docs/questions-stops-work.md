# Stops: work (Handshake, Droid, T3, T4): questions and requests

Builder: stops-work. Files: `js/timeline/stops/handshake.js`, `js/timeline/stops/droid.js`.
Both pass the bench checks (widths 160/240, the p sweep, reduced motion, determinism,
no canvas text, transit too). On `/?debug=1` the console reads
`timeline check: 11 stops OK, 34/34 facts, 0 duplicates, determinism OK` with 0 errors
at 1280×800 and 375×812, scrolling down and back up.

## Requests for the engine and the markup (worked around locally)

1. **`lane` doesn't reach `transit.build`.** `js/timeline/index.js` passes `lane` to
   `transitRuntime(...).build`, but `transitRuntime.build` in `api.js` destructures only
   `{ w, h, from, to, side }` and forwards those, so a stop's `transit.build` gets
   `lane: undefined`. Workaround in both transits: `if (lane == null) lane = side ? 20 : 0`.
   Suggested fix (additive): forward `lane` in `transitRuntime.build`. The bench
   (`tools/stop.js`) also builds transits with neither `side` nor `lane`, so it always
   previews the phone layout.
2. **The year markers sat under the track layer: resolved by 68c8081** (merged into this
   branch). `.year-mark` is now `z-index: 2` on the page colour. Before that fix, T3's
   dusk hid the "2025" marker on desktop (game px x 6–20 near the bottom of the
   Handshake→Droid connector), so T3 still starts its dusk skyline right of
   `w/2 − lane − 2`. With the fix the marker's opaque strip covers only x < 20 for about
   8 rows, clear of the chute (it ends at 0.48 h) and of his drop. Re-checked after the
   merge at 1280×800 and 375×812.

## Questions for Shrey (defaults picked; nothing blocked)

1. **Two spoken commands in Droid.** He says "Forward" (the robot rolls through the
   building), then "Extinguish" (it foams the fire). The scene plan has both, and the
   bullet says "spoken commands". *Default: both.* If you'd rather keep only "Forward",
   it's a one-line change.
2. **Are "Forward" and "Extinguish" the robot's real commands?** They come from the game
   level you approved, and they're the only words shown in the Droid scene (HTML labels,
   one at a time). *Default: keep them.*
3. **The wrong-colour cube** has no caption, because labels are capped at two and the
   prompt ("a red cube") isn't résumé wording. It goes from blue to red with a Flag, then a
   Pass. *Default: picture only.* The card's "prompt adherence" carries the meaning.
4. **Hand digits.** The broken hand has six digits (five fingers and a thumb), and the
   fixed one has five (four fingers and a thumb). The theme's hand had one digit too many
   in both states.

## Notes for the coordinator

- **Handshake.** The model's housing at the left feeds three images onto a raised belt:
  "Helo wrold", six digits, a blue cube. At the station he stamps each tag (stamp raised,
  then pressed), and it turns red with a flag icon. Gold notes fly up to the board, which
  lights with the label "Fine-tuned on my annotations". A cable carries the fine-tune
  into the model, and each image dissolves into static and resolves fixed ("Hello world",
  five digits, a red cube) with a green check. Reduced motion shows the finished state.
  The exit is a hatch with orange trim, which is the mouth of the T3 chute.
- **Droid.** A San Francisco night street. A simulation window (frame plus three dots, no
  title) shows a cut-away burning floor: brick, burnt boards, a fire wall. The robot is
  `drawRobot`, ported from `Robot.draw` (orange box, treads, one cyan eye, screen icons
  ▶ / foam / check, an antenna that lights). The Omi pendant (slate disc, teal dot) is
  drawn only while he's in the speak pose. The voice bubble holds a waveform, and the
  word is the HTML label beside it. Cyan signal dots arc from the bubble to the antenna.
  Foam is three fixed arcs, the wall sinks to a foam pile with steam, and the robot's eye
  squints happy. Reduced motion shows the fire out, the happy eye, him speaking, the
  bubble and "Extinguish" (the scene plan's key pose).
- **T3 (Handshake→Droid).** He slides down a steel chute with orange trim. Three image
  cards hang from a rail slung under it and ride down slower than him: cat and fish
  already pass, and the tree's tag flips from a red car icon to a green tree-plus-check
  icon as he passes it. Then he hops off the lip and drops through a low-contrast cloud
  floor into a faint San Francisco dusk skyline. No labels.
- **T4 (Droid→Northeastern).** He hops onto a new small cable car (original art: maroon
  and cream, gold belt rail, open ends with grab poles, a roof bell) sheared onto a steep
  street with rails and a cable slot, past a faint row of narrow houses. He rides one-handed
  (`hangOne`), facing downhill both ways, hops off, and drops through a cloud floor into
  snow that falls with the scroll. Reduced motion shows the car parked at the bottom and
  the snow still.
- **Hardware stays on the free side.** On desktop T3 runs left of the Handshake card, and
  T4 runs right of the Droid card.
- **Neither stop has an idle loop** (`idle` off), so nothing moves unless you scroll.
- **Numbers.** Bright pixels (over 70% luminance) are 1–4% of each scene, against a 12%
  limit. Build is ≤ 2 ms at 240 and draw ≤ 1 ms.

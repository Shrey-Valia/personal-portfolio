# Critique: the scroll timeline (S6)

Branch `game-v2` at 875415c, served by the no-cache dev server on :4173. I judged it as a recruiter would: can I read it fast, does anything look broken or odd. I changed no code.

**How I tested**
- Viewports: desktop 1280×800 (DPR 2), phone 375×812 and 320×640, plus a tablet spot check at 768×1024.
- **Sweeps:** every 8 px down and then back up the whole page, calling `__tl.drawNow()` at each step. Each step recorded the engine state, the hero element's rect, how much of it any card or text block covered, how far it moved from the previous step, and the script time.
- **Reduced motion:** `__tl.setReduced(true)`. This runs the same code path as the `matchMedia` change listener.
- **Print:** I disabled the screen-only sheets in memory and promoted the `@media print` rules, then measured at 695 px, the content width of a Letter page.
- **No JS:** the page loaded in a sandboxed iframe that doesn't allow scripts.
- **Caveat:** the Browser pane was hidden the whole time. That throttled `requestAnimationFrame` to about 2 fps, and sometimes paused it. So I drove frames with `drawNow()`, and I couldn't time smooth-scroll link animations, though they always landed in the right place. Idle-loop frame rates are judged from the code, not measured.

**Verdict:** I found no P0. Content, routes, print, no-JS, reduced motion, performance and phone overflow all pass. There are three P1s, and the Contact ending is the one that matters most.

---

## What passed (§10 checklist)

| Check | Result |
|---|---|
| Above the fold at 1280×800 | Name, tagline, email / LinkedIn / GitHub pills, the open-to-internships line, the Jump menu and Résumé PDF are all visible without scrolling, and the hero is at his desk in the intro scene. At 375×812 the first screen also shows the top of the home scene. |
| Debug line | `[timeline] timeline check: 11 stops OK, 34/34 facts, 0 duplicates, determinism OK`. **0 console errors** on every load, including after `#play` and Back. |
| Hero path, desktop | In 996 steps down and 996 back up he was never hidden during a transit, never more than 30% covered by a card or text block, never off-screen and never under the bar. **One jump**, in T0 (see P1-2). The result is the same with every More open. |
| Reversibility | 82 positions hashed scrolling down and again scrolling up. The only 8 mismatches are at stops with an idle loop in hold (intro, ORNL, EduLearn, Skills), and they change with the clock even when the page isn't scrolled. Everything else matches exactly. |
| More buttons | Vincio, ORNL, Handshake and Trading expand and collapse. `aria-expanded` and the label ("More (n)" / "Less") update, the layout re-measures (Contact moves 193–318 px), and the hero stays clear of the cards. |
| Jump menu | It opens, closes when a link is clicked, sets the hash, and lands each stop with its scene below the bar and the card under it. Loading `/#ornl` directly puts the scene top at 154 px. |
| Content | 34 `data-fact`, each exactly once. LinkedIn is `https://www.linkedin.com/in/shrey-valia-7a0041267/` in all 3 links and in the JSON-LD. A grep of index.html, js and css finds **no phone number** and no `tel:`. **No `.pdf`** file or link. Order: intro, vincio, ornl, handshake, droid, neu, dhs, edulearn, trading, skills, contact. Year markers: 2026 above Vincio, 2025 above Droid, 2024 above EduLearn. **38/38 skill chips** are visible, under the line "38 skills in 5 areas". |
| Phone | No horizontal scroll at 375 or 320 (scrollWidth equals clientWidth through a full sweep at 320). No text under 13 px: the smallest is the snapshot's `dt` at 13 px and scene labels at 13.5. Scenes run edge to edge (372×200 at 375; 320×200, the 160-px core, at 320). The path runs under the cards as designed, and the hero is never stranded on top of text. |
| Reduced motion | The hero shows only at the current stop and snaps at 11 scroll positions. The track hero is never drawn (0/498 steps). The canvas hash is unchanged after 800 ms, so there are no idle loops. Every scene shows its finished state: `final_cut.mp4 ✓`, `Run complete ✓`, `Extinguish`, `1st Place`, `43% win rate / 2.76 profit factor`, the bonded chain, the formed T3 chute. |
| Print | The order regroups to Experience (ORNL, Handshake), Projects (Vincio, Trading), Education & honors (NEU, Droid, DHS, EduLearn), then Skills. Scenes, chips, More, the bar, the year markers and the footer are hidden. All bullets print. Header plus Experience plus Projects is 891 px tall, which fits page 1 of about 950 px, so it comes to two pages. |
| `#play` | Game modules (32 files) load only after the click, and the title screen renders. Back returns to the timeline, running, at the previous scroll position. |
| No JS | 34/34 facts visible, 0 scene boxes, 10/10 hidden bullets showing, `.js-only` hidden, the noscript banner shown. The bar and the popover Jump menu are present. |
| Landing requests | 0 requests to `js/game/**` or `js/themes/**`. |
| Performance | Script time per scroll step (`drawNow`) at desktop: median 0.10 ms, p95 0.30 ms, max 2.3–3.0 ms over about 1,000 steps. Including a forced layout: median 0.30 ms, max 1.8 ms. Phone: median 0.10, p95 0.40, max 2.5 ms. A relayout (`measure`) takes ≤ 0.8 ms. With no input at a transit position: **0 frames in 2 s**. Idle loops run only for the active, visible stop in hold, with the timer cleared when the tab is hidden. All of this is well inside the 4 ms budget. |

---

## P0: broken or embarrassing for a recruiter

None found.

---

## P1: noticeable

### P1-1. At the bottom of the page, the Contact payoff (hero and lit beacon) is hidden above the viewport (confirmed and sized)

- **Viewport:** 1280×800, 375×812, and any window shorter than about 900 px.
- **Repro:** load `/`, press End (or flick to the bottom), and look at the top of the screen.
- **Seen:**
  - At max scroll (7953) the Contact scene box starts at −102 px. The 64 px sticky bar covers the next 64 px.
  - Only **134 of 300 px (45%)** shows: the dock, the three signs and the base of the tower.
  - The lantern, the beam and the hero standing at the lantern (game y about 8–35) are **100% hidden**.
  - Even at the end of the dwell (scroll 7841, p 0.999) the scene's top is at y 10, so the lantern is already under the bar before you reach the bottom.
  - Phone 375×812 is worse: 48 of 200 px visible (24%).
  - Tablet 768×1024 is fine (250/250).
- **Sizing:** below the scene sit 602 px of content: an 18 px gap, the 308 px card, an 88 px stop margin, the 108 px footer and 80 px of `<main>` padding. Visible part = vh − 64 − 602. That is 34% at 1366×768, 45% at 1280×800 and 78% at 1440×900; it only fits at about 966 px tall.
- **Why not the other options:**
  - A **bottom spacer** makes it worse: more scroll moves the scene further up at max scroll.
  - **Dwell changes** don't move the scene at rest.
  - **Trimming margins and the footer** saves at most about 170 px. That isn't enough under about 830 px tall, and not on phones.
- **Smallest fix: card order, Contact card above its scene.** It's CSS only, in `css/timeline.css` (owner S2):
  ```css
  .view-page #contact { display: flex; flex-direction: column; }
  .view-page #contact > .stop__card { order: -1; margin: 0 0 18px; }
  ```
  The page height doesn't change, and the page now ends lighthouse, then footer:
  - At max scroll the scene top lands at about 224 px at 1280×800 and about 282 px at 375×812, so the whole lighthouse is in view.
  - The engine needs no change: `measure()` reads the DOM, and T9 simply gets 326 px longer.
  - The Contact dwell becomes [7687, 7953]. The beacon lights at about 7873, while the scene is fully in view, and the hold (the beam's sweep) ends exactly at the bottom of the page. That is what §2.4 intended.
  - Print is unaffected (timeline.css is screen-only), and so is no-JS (#contact is `.js-only`).
- **Optional:**
  - In `js/ui/cards.js` `sides()`, give `#contact` the same side as `#skills` (right). Then the moved card doesn't sit over T9's free-side bluff on desktop. Without it the path just passes behind the card, which is allowed.
  - Related P2-1: the focus line ignores the sticky bar.

### P1-2. T0 (intro to Vincio), the first move every visitor sees, plays in 40 px of scroll, so the hero teleports

- **Viewport:** 1280×800.
- **Repro:** from the top, scroll slowly from 400 to 470 px, or give the mouse wheel one tick.
- **Seen:**
  - The intro's dwell ends at 417 and Vincio's starts at 457. The windows overlap and are split at the midpoint with only `MIN_WALK = 40` (`js/timeline/layout.js:15`).
  - T0's connector is 64 game px (192 CSS px), so the hero moves about 4.8× the scroll speed. The sweep flagged an **89 px move in a single 8 px step**.
  - Every other desktop transit gets 99–779 px of scroll, a ratio of 1.2–2.8×.
  - The bookends builder's choreography (hop off the ledge, fall through the cloud, three hops down the clip platforms) can't be seen. One wheel tick or a short trackpad swipe skips all of T0, and it reads as a glitch on the first scroll.
- **Owner:** `js/timeline/layout.js` with `js/timeline/index.js`. CSS is the quick alternative.
- **Fix, robust:** pass each connector's CSS height into `dwellWindows`; `measure()` already builds the gaps before computing windows. When splitting overlapping windows, reserve `walk = max(MIN_WALK, 0.6 × gapPx)` on desktop only (`lane > 0`). On phones the transit is under the card, so short is fine there. T0 then gets about 115 px, and the intro's hold and Vincio's walk-in each give up about 38 px.
- **Fix, quick:** in `css/timeline.css:146`, raise `.view-page .timeline { margin-top }` from 64 px to about 170 px at ≥ 1000 px. The raw windows then stop overlapping: T0 gets about 120 px of scroll for a 300 px path.

### P1-3. The Trading card shows "43% win rate" and "2.76 profit factor" without their qualifier, and the chip both the spec and the builder rely on doesn't exist

- **Viewport:** all.
- **Repro:** scroll to Algorithmic Trading Bot and read the chips under the lead bullet.
- **Seen:**
  - The chips are "43% win rate" and "2.76 profit factor" only.
  - The sentence that holds the context ("in walk-forward backtests…", p-trade-4) is hidden behind More.
  - TIMELINE-SCENES §1 Stop 9 requires "Walk-forward backtests (the qualifier is always visible)". The lab-projects builder dropped the scene heading because "the chip under the card always shows the qualifier".
  - A bare 43% also reads as weak to a skimmer: fewer than half the trades won.
- **Owner:** `index.html` p-trade-4 (line 384), plus `js/ui/cards.js` `chips()` (S2).
- **Fix:** mark the phrase so it becomes a third chip, for example `<span data-chip="">walk-forward backtests</span>`. Then have `chips()` capitalise the first letter, or use a CSS `::first-letter` rule on `.stop__chips li`. The chip row becomes "43% win rate · 2.76 profit factor · Walk-forward backtests". An alternative is one chip that reads "43% win rate (walk-forward)".

---

## P2: polish

1. **The focus band ignores the 64 px sticky bar.**
   - **Viewport:** desktop and phone.
   - **Repro:** `__tl.goto('vincio', 1)`, or any stop's last 15% of p.
   - **Seen:** windows run from scene centre at 0.8·vh to 0.2·vh (phone 0.95 to 0.05). At the end of each dwell the top 54 px of the scene (desktop) is under the bar. On phone the hold already ends with the scene top at about 50 px, under the 64 px bar.
   - **Owner:** `js/timeline/layout.js` `FOCUS`, `js/timeline/index.js` `measure()`.
   - **Fix:** read the bar height into `G` and map `from`/`to` onto the band [bar, vh] instead of [0, vh].
2. **ORNL's "Molecular self-assembly" label covers the hero as he exits.**
   - **Viewport:** 1280×800.
   - **Repro:** `__tl.goto('ornl', 0.985)`.
   - **Seen:** he slides down the bead chain straight through the label at game y 88 (`js/timeline/stops/ornl.js:244`).
   - **Fix:** drop the label in the `out` phase, or put it beside the pit (align left or right of `route.exit`).
3. **ORNL's "Run complete ✓" is clipped at 320 px.**
   - **Viewport:** 320×640.
   - **Repro:** `__tl.goto('ornl', 0.6)`.
   - **Seen:** the pill's left edge is at x = −2 (`ornl.js:243`).
   - **Fix:** clamp the label's x to `[halfWidth + 2, w − halfWidth − 2]` at narrow widths, or align it left.
4. **Trading's hold leaves an empty dark plate.**
   - **Viewport:** all.
   - **Repro:** `__tl.goto('trading', 0.7)`.
   - **Seen:** once the board's two figures appear, the "Simulated $50,000" label is dropped (two-label cap). Its navy plate (`trading.js:133–136`) stays empty, which looks like a missing label.
   - **Fix:** draw the plate in `draw()` only while its label shows, or fade it with `f.act`.
5. **Trading's red ▼ reads as a loss to a skimmer.**
   - **Viewport:** all.
   - **Repro:** `__tl.goto('trading', 0.45)`.
   - **Seen:** a red down-triangle next to the top of the equity curve.
   - **Fix:** recolour the exit marker gold or white, keeping the shape (see Q5).
6. **Skills tier icons were never placed on the card.**
   - **Viewport:** all.
   - **Repro:** look at the Skills card headings.
   - **Seen:** `skills.js` exports `tierIcons()` (bookends request 3), but nothing imports it, so the scene's five lit bricks don't map to the card's five headings.
   - **Owner:** `js/ui/cards.js` plus `css/timeline.css`.
   - **Fix:** use the snippet in `docs/questions-stops-bookends.md` §"For the engine owner" item 3, and hide the icons in print.
7. **The Jump popover opens far from its trigger on desktop.**
   - **Viewport:** 1280×800.
   - **Repro:** click "Jump to".
   - **Seen:** the button is at x ≈ 303, but the menu opens at x 820–1180, pinned to the right edge (`css/timeline.css:77`).
   - **Fix:** at ≥ 768 px, anchor it under the button, either with CSS anchor positioning, or with `inset: 72px auto auto max(16px, (100% - 1080px)/2 + 140px)`. Keep the right-hand placement for the phone Menu.
8. **The Jump list's year column is out of sequence.**
   - **Repro:** open Jump.
   - **Seen:** "2026, 2026, 2026, 2025, **exp. 2029**, 2025, 2024, 2024".
   - **Fix (`index.html:224`):** remove the year for Northeastern, or show "now".
9. **The EduLearn card repeats itself.**
   - **Repro:** read the EduLearn card.
   - **Seen:** header "EduLearn Hackathon · Online · Oct 2024", then "Award: 1st Place of 700+ participants, EduLearn Hackathon (Oct 2024).", then the chip "1st of 700+".
   - **Fix:** needs Shrey, since the site mirrors the résumé PDF. Suggest "1st place out of 700+ participants." (`index.html:368`).
10. **The LinkedIn pill wraps on phones.**
    - **Viewport:** 375×812.
    - **Seen:** "linkedin.com/in/shrey-valia-" breaks onto two lines in both the intro and Contact.
    - **Fix:** on screen show "LinkedIn" (or "in/shrey-valia") with the full URL in `href`. Keep the printed URL through a print-only span.
11. **Vincio, ORNL and Handshake cards have no chips.** Trading, Droid and EduLearn do, so the work entries look plainer than the projects. The spec's chips (B-roll selection…, Deployed on Vercel…, Quality and safety rubrics…) were never marked. Add 1–2 `data-chip` per card (see Q15).
12. **The phone intro cuts the oak at the left edge.**
    - **Viewport:** 375×812.
    - **Repro:** load the page.
    - **Seen:** a 6–8 px sliver of the valley-oak island at x 0, which looks like a crop error.
    - **Fix (`intro.js`):** drop the wing oak when `w < 200`, or shift it fully into view.
13. **T9 is a long, plain ladder beside a flat box.**
    - **Viewport:** 1280×800.
    - **Repro:** scroll from Skills to Contact.
    - **Seen:** 780 px of scroll climbing a 960 px ladder. The bluff face left of it reads as a lighter navy rectangle, the same "box against the page" problem the school builder dropped from T5.
    - **Fix (`skills.js` transit):** dither or roughen the bluff's edge, and add one or two root knots or a midway ledge.
14. **Props vanish as he leaves NEU and DHS** (school request 2). The book stack, the cap and the diploma are drawn in the scene canvas, so they disappear when he steps onto the track. It's minor.
    - **Fix:** a `hero.props` or `transit.overlay` hook in `api.js` and `index.js`.
15. **The Vincio title kerns as "AIVideo".**
    - **Viewport:** all.
    - **Seen:** Fredoka sets "AI Video" with almost no gap.
    - **Fix:** use `word-spacing: 0.05em` on `.entry__head h3`, or a slightly wider space in the h3 only.
16. **No-JS: the Contact links lead nowhere.** `#contact` is `.js-only`, so the bar's "Contact" link and the Jump list's "Contact" link point at a hidden element when JS is off.
    - **Fix:** point them at `#contact-links` in no-JS, or drop `.js-only` from the section and hide only its scene.
17. **Landing JS is about 116 KB gzip, against the 60 KB budget in §7.** The figure is the sum of the files fetched, each gzipped (329 KB raw). `validate.js` is imported statically even without `?debug`.
    - **Fix:** load `validate.js` with `import()` only when debug is on. Accept the rest, or trim the larger stops (handshake 639 lines, droid 524).
18. **Fractional DPR may shift the layout after JS loads** (from the code; I couldn't emulate it). At DPR 1.25 or 1.5 (common Windows laptops), `scale = round(3 × dpr)` gives k = 3.2 or 3.33, so every scene box grows from the CSS-reserved 300 px to 320–333 px once JS runs. That is 11 shifts after first paint.
    - **Fix:** reserve `--scene-h` using the same rounding, or keep k at a whole number of CSS px by setting `--gp` per DPR.
19. **"Résumé PDF" opens the print dialog.** The tooltip explains it, but recruiters expect a download.
    - **Fix:** label it "Print / PDF", or "Save as PDF" with the tooltip as it is.
20. **Scene labels show up in Ctrl+F and in copied text.** They're `aria-hidden`, but innerText includes them ("final_cut.mp4 ✓", "43% win rate" before the card). Minor.
    - **Fix:** `user-select: none` on `.tl-labels`. Find-in-page will still match them.

---

## Scene by scene (against TIMELINE-SCENES.md)

| Stop | Reads in ~3 s? | Phone | True to the bullet, no invented numbers? | Notes |
|---|---|---|---|---|
| Intro | Yes: he works at his desk in a floating house, then shoulders his backpack and leaves | The house sits left of centre and the oak is cut off at the edge (P2-12) | No claim | Opens at the desk rather than at the door (builder choice, Q2) |
| Vincio | Mostly. The editor UI, four agent bots and their capability labels read; the clip pips are small | Clear at 186 px | Yes: 4 agents = the 4 capabilities in p-vincio-2 | Labels "Raw clips", "Written vision", the four capability names, then "final_cut.mp4 ✓" |
| ORNL | Yes: Run, then racks, then bonded chain plus "Molecular self-assembly" | OK, but the Run label clips at 320 | Yes. The racks have no count on screen | Label covers his exit (P2-2) |
| Handshake | Yes, the clearest scene: flags, then fine-tune, then fixed with checks | Label fits at 160 px | Yes | The vertical path crosses the board and belt; busy but fine |
| Droid | Yes: voice bubble, robot in the sim window, fire out | Good | Yes ("digital robot") | Commands are from the game (Q11, Q12) |
| Northeastern | Yes: books fly into his arms with course names | Good | 7 books = 7 `data-credit` | The label pill sits over the path dots at the top; fine |
| Dublin High | Yes: stage, cap, diploma, caps tossed | Good | "Class of 2025" comes from the card's date | — |
| EduLearn | Yes: 700-tile call, "1st Place", podium | Good | 700 tiles from "700+" | The podium's 1/2/3 are pixel numerals, the only digits drawn on canvas; harmless |
| Trading | Mostly: autopilot cart climbs the curve, board shows the figures | Good | 43% and 2.76 are parsed from p-trade-4, $50,000 from p-trade-1 | Empty plate in hold (P2-4), red ▼ (P2-5), no qualifier (P1-3) |
| Skills | Partly: a tree with five lit bricks; no labels, so the mapping to the five areas isn't obvious | Good | No counts | Needs the tier icons on the card to connect (P2-6) |
| Contact | Yes, while scrolling through it | Good while scrolling | No claim | Hidden at rest at the bottom (P1-1); the beam is faint |

**Every HTML label over the scenes:** Raw clips, Written vision, B-roll selection, Motion graphics, Transitions, On-screen text, final_cut.mp4, final_cut.mp4 ✓, Run, Run complete ✓, Molecular self-assembly, Fine-tuned on my annotations, Forward, Extinguish, the 7 course names, Relevant coursework, Class of 2025, Final results, 1st Place, Simulated $50,000, Without manual input, 43% win rate, 2.76 profit factor.
- No typos.
- No more than 2 labels at once, and no two labels overlapping (checked at 320).
- "Without manual input" is a sentence fragment as a floating label, but it is the résumé's own wording.

---

## Questions for Shrey

Collected from the four `questions-stops-*.md` docs, with duplicates merged. Each line: the question, then the builder's default, then my recommendation.

1. **Intro house.**
   - Default: floats on a lump of the gold hills above the clouds.
   - Rec: keep it; it sets up the descent.
2. **Intro beats.**
   - Default: he's seated at his desk, waves on load and every 8 s, and types in between. Scrolling makes him take his backpack and leave. With reduced motion he's seated and waving.
   - Rec: keep.
3. **Skills.**
   - Default: he climbs down the trunk (not a fire-pole slide), and the bands have no labels.
   - Rec: keep, but put the tier icons on the card headings (P2-6) so the bands map to the card.
4. **Contact.**
   - Default: he hops to the far end of the dock and walks back past the three lamps. The beam sweeps once, then rests. The beacon has no words.
   - Rec: keep, with the card-order fix (P1-1) so the ending is visible.
5. **Trading's red ▼ exit marker.**
   - Default: keep it, placed above the line and higher than the ▲.
   - Rec: keep the marker but make it gold or white. Red-down reads as a loss.
6. **No "Walk-forward backtests" heading in the Trading scene.**
   - Default: leave it to the card's chip.
   - Rec: fine, but only once that chip exists (P1-3).
7. **Label wording choices.**
   - Default: Vincio says "final_cut.mp4 ✓" (not "Finished cut"); Trading says "Without manual input" (not "Autopilot · no manual input"); ORNL's Train window was dropped.
   - Rec: keep all three.
8. **No dotted spine on T1, T2 and T8.**
   - Default: the hardware itself (shaft, knobs, git lines) is the path.
   - Rec: keep; it reads as the path.
9. **Words on T7's two feed rails?**
   - Default: colour only (words would need a kit addition).
   - Rec: colour only; the p-trade-2 bullet names both feeds.
10. **Northeastern: catch the books, or the old staircase?**
    - Default: the catch.
    - Rec: keep the catch. It reads in one glance and fits the API.
11. **Other school choices.**
    - Default:
      - EduLearn: his podium climb is the walk-in; the Live badge has no word.
      - Dublin High: the banner's year comes from the card's date.
      - T5: the hill-crest silhouette was dropped.
      - T6: he faces down-cable both ways.
    - Rec: keep all.
12. **Two spoken commands in Droid.**
    - Default: "Forward", then "Extinguish".
    - Rec: keep both; the bullet says "spoken commands".
13. **Are "Forward" and "Extinguish" the robot's real commands?**
    - Default: keep them; they come from the game level you approved.
    - Rec: please confirm. If they're not real, swap in the real words; they're HTML labels, a one-line change.
14. **Handshake's wrong-colour cube and the hand.**
    - Default: the cube has no caption. The broken hand has six digits and the fixed one has five.
    - Rec: keep both.
15. **Chips for Vincio, ORNL and Handshake** (from the spec; not built).
    - Default: none.
    - Rec: add 1–2 each, for example "Multi-agent", "Deployed on Vercel", "Prompt adherence", so the work cards match the projects.
16. **EduLearn sentence wording** (P2-9).
    - Default: the résumé text as written.
    - Rec: "1st place out of 700+ participants." Change it in the résumé PDF too, so the two stay in sync.

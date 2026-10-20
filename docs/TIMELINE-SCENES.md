> **Coordinator notes (read first).** Where this differs from docs/TIMELINE-ARCHITECTURE.md, the architecture wins on mechanics:
> - Each stop's action is **scroll-scrubbed** in its act phase (0.15–0.55 of the stop's p), not a timed beat. The seconds below become fractions of the act phase.
> - "More" is a JS-built button over `li.is-more`, not `<details>`.
> - Scene size and scale come from the engine (100 game px tall, 160–240 wide; keep everything that matters in the centred 160).
> - **More decisions (2026-10-20):** intro one-liner = the résumé tagline ("Computer Science + Computer Engineering at Northeastern University. Machine learning research, AI tools, and hackathon builds."); Droid shows the burning building inside a simulation window (digital robot); Skills card shows all 38 chips; year markers yes (2026 above Vincio, 2025 above Droid, 2024 above EduLearn).
> - **Shrey's decisions:** Droid comes BEFORE Northeastern. No Northeastern start date (keep "Expected May 2029"; drop the 2025 year-marker placement that assumed otherwise). Lead bullets as proposed. Contact ends at the lighthouse beacon.

# Scroll-timeline choreography and art direction for Shrey Valia's portfolio

## 0. Concept and global rules

**The concept is a descent.** The top of the page is high night sky, which is "now". As you scroll, the hero goes down through the 2026 work, reaches the ground at Boston, San Francisco and Dublin, ends up in the roots of the skills tree, and finishes at sea level at the lighthouse. Going down the page means going back in time and down to the foundations. Visitors don't need to notice the metaphor. It just gives each section a believable place on the path.

**Path and hardware.** The spine is the game map's dotted road, turned vertical:
- 2×2 dots on a 6 px pitch with an ink outline (the style of `drawPath` in mapart.js).
- Dots the hero has passed are cream `#fff3c4`. Dots ahead are the map's "locked" `#4f5f86`. This progress colouring follows scroll and reverses with it.
- At each traversal the spine carries "hardware" (ledges, ladders, rails, cables) in that era's material.

**Scroll model.** These numbers are for the engine planner:
- **Traversals follow scroll exactly.** The hero's position is an arc-length parameter s along the segment's polyline. Each section uses up scroll in proportion to max(|dy|, 0.75·|dx|).
- **Pose comes from the section type and the scroll direction:**
  - drop: fall going down, jump going up
  - hop: jump on the first half of the arc, fall on the second
  - walk or stairs: run cycle advances one frame per 6 game px travelled; he faces his direction of travel, so he turns round when you scroll up
  - ladder: climb
  - cable: hang
  - slide: crouch
  - ride: stand or hang
- **Idle.** After 150 ms without scroll he goes to idle or blink. On a ladder or cable he holds his grip pose instead.
- **Stops have four phases:**
  1. **Arrive.** Scroll-linked, while the scene's top moves from 100% to 60% of the viewport. He walks or drops to his mark.
  2. **Beat.** Time-based, 2–4 s. It fires once when he is on his mark and the scene's centre is at or above 60% of the viewport.
  3. **Hold.** He stays on his mark until the card's top reaches about 30% of the viewport.
  4. **Exit.** He steps into a small notch where the dotted line runs under the card. He is hidden behind the opaque card, then comes out of its bottom notch when the card's bottom reaches about 75% of the viewport.

  He is never over the card text.
- **Resolved states stick.** Once a beat has played, its scene stays in the resolved state for the rest of the visit. If the visitor scrolls past before a beat finishes, the beat jumps to its end state.
- **Scene text limits:**
  - at most two canvas labels visible at once
  - at most 4 words each
  - every label is real résumé wording or a literal UI word
  - no enemies, coins, lives, `>_` blocks, `?` glyphs, or star shapes

**Card format (Shrey's decision).** Each card has:
- The title block: the h3 plus the role line.
- The dates line.
- One lead bullet.
- Highlight chips.
- A native `<details><summary>More</summary>` holding the other bullets. Opening it changes page height, so the engine must re-measure segment offsets.

Chips come only from verbatim résumé text. The cleanest way is to mark them in index.html with `data-chip` spans around the exact phrases and `data-lead` on the lead `<li>`, like the page-view worktree's `data-stat`. Nothing gets typed twice.

Source folders referenced below:
- MAIN: `/Users/shreyvalia/Desktop/personal portfolio`
- WT-P: `/Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-projects-f655f6`
- WT-W: `/Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-work-4eb2b4`
- WT-S: `/Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-school-dc0401`
- WT-F: `/Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-finale-9cd67c`

**Porting rule.** Copy drawing code out of the worktree theme files into each stop's own module. Don't import the theme files: they register kits, enemies and songs as a side effect. Strip out platforms, hazards and sound. Use the coordinator's fake-level shim only when a class is reused whole.

---

## 1. Per stop

### Stop 1 · Intro (top)

- **Above the scene, DOM only (visible at first paint, nothing waits on art):**
  - h1 "Shrey Valia"
  - a one-line role (wording is decision 1 in section 7)
  - Email · LinkedIn · GitHub pills
  - the `c-open` line
  - a small "Play the game ▶" link at top right
- **Scene, 320×72:** night sky. The top row is the page colour `#0e1433`, darkening to indigo.0. A few 1 px twinkles (no star shapes). A short steel start ledge sits at centre with the first wisps of the cloud band just below it.
- **Beat (1.6 s, on load):**
  - 0–1.2 s: the hero waves (3 cycles)
  - 1.2–1.6 s: he glances down the path
  - then idle and blink

  The first scroll makes him hop off the ledge (start of T0).
- **Depicts:** no claim; this is a greeting.
- **Reuse:** `stripedSky` and `disc` from MAIN `js/art/draw.js`.
- **New poses:** wave ×2, lookDown (shared pose pack).
- **Reduced motion:** wave frame 1 on the ledge.
- **Mobile:** the core is the ledge plus the hero.
- **Alt text:** "Shrey's pixel character waves from the top of the timeline path."

### Stop 2 · Vincio, AI Video Editor (Jan–Aug 2026)

- **Scene, 320×120, accent cyan:**
  - The floor is a three-lane editor timeline: V1 clips, A1 audio, gold text lane.
  - The backdrop is the dim editor (studio panels, playhead).
  - Left: a small "Vincio" browser window (the front end) on a stand.
  - Centre: a "Written vision" script page on a post.
  - Four agent bots docked above the lanes.
- **Beat (3.6 s):**
  - 0–0.8 s: the hero types at the Vincio window. Four raw clips drop onto V1 out of order (3, 1, 4, 2) under the label "Raw clips".
  - 0.8–2.6 s: the agents wake in sequence and beam to their lanes.
    - cyan B-roll bot drops a thumbnail onto V2
    - magenta motion bot plots a three-diamond keyframe arc
    - white transition bot sets a bowtie at a cut
    - gold text bot types "On-screen text" into the text lane

    Meanwhile the clips snap into order 1-2-3-4 with an outBack ease.
  - 2.6–3.6 s: a red playhead sweeps the cut, the label changes to "Finished cut", and the hero does his victory pose.
- **Depicts:**
  - p-vincio-1: clips plus written vision become a cut, through agents working in sequence, which is what "coordinated" means.
  - p-vincio-2: the four named capabilities, one bot each.
  - p-vincio-3, built half: he works at the front end, and the agent layer he built does the editing. That is truthful: he built the editor and does not edit by hand.
  - The contributed parts (database, auth, memory) appear only in the card, which keeps "built" and "contributed" from blurring.
- **Reuse:** WT-P `js/themes/vincio.js`:
  - `CLIP` (36), `scenePic` (54), `drawClip` (72), `drawAgent` (339), `beam` (360)
  - `Cut` snap and sweep logic (371–446), `diamond` (599), `bowtie` (668)
  - `Caption` typing with `barW` (677–709)
  - Backstage's browser-window drawing (794–814) for the Vincio window
  - `studioBackdrop` (182–272), with the panels at 50% contrast
- **New poses:** type ×2, plus victory (existing).
- **Card:**
  - Title "Vincio – AI Video Editor"; role "Multi-Agent AI · LLM Orchestration · Full-Stack Web App"; dates "Jan 2026 – Aug 2026".
  - Lead: p-vincio-1.
  - Chips (verbatim from p-vincio-2, coloured as the scene legend): B-roll selection (cyan) · Motion graphics (magenta) · Transitions (slate) · On-screen text (gold).
  - More: p-vincio-2, p-vincio-3.
- **Reduced motion:** clips in order, four agents lit in place, playhead parked at 70%, hero standing by the window, label "Finished cut".
- **Mobile core:** the window's right edge, the four clips, the agents and the hero. The script page moves above the clips.
- **Alt text:** "Shrey types into Vincio's interface; four agent bots arrange raw clips and a written vision into a finished cut."

### Stop 3 · Oak Ridge National Laboratory (Jan–May 2026)

Polymer imagery appears here and nowhere else. It is the actual subject of this job.

- **Scene, 320×120, accent teal:**
  - Lab interior (dark panel grid) with one window onto the dawn ridges, dimmed.
  - Left of centre: a browser window titled "Configure" with three slider rows and a RUN bar below it.
  - Right of centre: a small "Train" window where the loss curve will draw.
  - Background: four small racks labelled GPU 0–3.
  - Foreground: a gap in the floor with eight monomer beads jittering in it.
- **Beat (3.4 s):**
  - 0–0.5 s: the hero presses Run (point pose).
  - 0.5–2.0 s: the RUN bar fills teal, the loss curve draws down, and the four racks' LEDs blink in lockstep.
  - 2.0–3.4 s: the beads snap into a bonded magenta/teal chain across the gap and the bonds draw in. The hero walks onto the chain.
- **Depicts:**
  - x-ornl-2: configure, train and run from the browser, through the front end he built.
  - x-ornl-1: the self-assembly the GNNs model is what appears.
  - x-ornl-4: four GPUs in lockstep means parallelised.
  - x-ornl-3 (inverse design) is carried by the exit traversal T2 and the card.
- **Reuse, MAIN `js/game/setpieces.js`:**
  - `Assembly` (19–84), runnable with a fake level: trigger by setting `triggered = true`
  - `RunBar` (88–122). Replace its "Hit the >_ block to run" label with "Run" → "Run complete ✓", because Shrey rejected `>_`.
  - `Browsers` kinds config and loss (126–163)
  - `Lifts.back` rack drawing (224–238)
  - `labInside` and `labDawn` from MAIN `js/art/backgrounds.js` (25, 109)
- **New poses:** point (shared).
- **Card:**
  - Title "Oak Ridge National Laboratory"; role "Machine Learning Research Assistant"; dates "Remote · Jan 2026 – May 2026".
  - Lead: x-ornl-1, which includes Dr. Rajeev Kumar.
  - Chips: Deployed on Vercel · Inverse prediction model · Parallelized GPU training.
  - More: -2, -3, -4.
- **Reduced motion:** RUN bar full with "Run complete ✓", loss curve drawn, chain bonded, hero on the chain.
- **Mobile core:** Configure window, RUN bar, bead gap and hero. The Train window and racks fall in the wings.
- **Alt text:** "Shrey runs a model from a browser tool; monomer beads self-assemble into a polymer chain."

### Stop 4 · Handshake AI (Jan–May 2026)

- **Scene, 320×120, accent orange:**
  - Handshake's label factory deck in moonlit cloud tops. `factorySky` regraded from day to night.
  - Centre: one gold-framed generated image, captioned with its prompt "a waving hand", showing six fingers.
  - Wings (desktop only): the "Helo wrold" sign and the blue cube, both smaller.
  - Above the frames: a slim panel reading "Fine-tuned on my annotations" (Shrey approved this wording).
- **Beat (3.8 s):**
  - 0–0.6 s: the hero inspects (point pose).
  - 0.6–1.4 s: he stamps a red tag, "Extra finger" (stamp pose). On desktop the wing frames get "Misspelled" and "Wrong colour" in the same pass.
  - 1.4–1.8 s: the panel lights cyan.
  - 1.8–3.4 s: each frame dithers into noise and resolves to the fixed image (five fingers, "Hello world", red cube). The tags flip to green "Fixed ✓".
  - 3.4–3.8 s: idle.
- **Depicts:**
  - x-hs-2: he evaluates text-to-image output, his annotations feed the fine-tune, and the model generates better.
  - x-hs-3: he diagnoses the failures and prompt adherence improves.
  - The three standard failures are the ones Shrey kept.
  - x-hs-1 is carried by T3.
- **Reuse:** WT-W `js/themes/handshake.js`:
  - `paintHand` (922), `paintSign` (950), `paintCube` (960), `FRAME_ART` (978)
  - `bake` (762), `nhash`/`noiseCol` (478–484)
  - `GalleryFrame.drawImage` regen dither (1048–1076)
  - GalleryFrame frame and caption drawing (1022–1046)
  - `factorySky` (237), regraded so its top is `#0e1433` and its clouds are slate/indigo
- **New poses:** point (shared). The stamp is drawn as an overlay in this module: the T_UP frame plus a 3×3 stamp prop, then T_FWD for the down stroke.
- **Card:**
  - Title "Handshake AI"; role "AI Training Specialist, Handshake AI Fellow (Part-time)"; dates "Remote · Jan 2026 – May 2026".
  - Lead: x-hs-2.
  - Chips: Quality and safety rubrics · Prompt adherence.
  - More: -1, -3.
- **Reduced motion:** all frames fixed, green "Fixed ✓" tags, panel lit, hero beside the hand frame.
- **Mobile core:** the hand frame, the panel and the hero.
- **Alt text:** "Shrey flags a generated hand with six fingers; after fine-tuning on his annotations it regenerates with five."

### Stop 5 · Northeastern University (expected May 2029)

- **Scene, 320×120, accent red brick:**
  - Boston dusk with light snow, brick sidewalk, limestone lecture-hall facade at right.
  - The `neu` clock-tower landmark at 1× in the far skyline.
  - A green streetcar stopped at left.
  - Seven floating hardback textbooks forming a staircase that steps down to the hall doors, one per `[data-credit]`.
- **Beat (3.6 s):**
  - 0–0.6 s: the hero, having landed on the streetcar roof, hops onto book 1.
  - 0.6–3.2 s: he hops down books 1 to 7 at 0.37 s each. Each book's glyph turns gold when he lands, and the nearest book shows its course name in a pill, one at a time.
  - 3.2–3.6 s: he lands at the doors.
- **Depicts:** e-neu-courses, one book per listed course, drawn from markup. Boston from the meta line.
- **Reuse:** WT-S `js/themes/neu.js`:
  - `K` (37), `neuBackdrop` (209), `drawFlakes` (299)
  - streetcar body (476–544, static)
  - facade (583–621)
  - `GLYPHS`, `glyphFor`, `glyph` (635–651)
  - textbook drawing and name pill (706–731)
  - MAIN mapart `LANDMARK.neu` (needs exporting)
- **New poses:** none (jump and fall).
- **Card:**
  - Title "Northeastern University"; role "Bachelor of Science in Computer Science and Computer Engineering"; dates "Boston, MA · Expected graduation May 2029".
  - Lead: the degree line.
  - Chips: the 7 courses, each with its book glyph at 2×.
  - No More (nothing else in this entry).
- **Reduced motion:** all books gold, hero at the doors, no snowfall.
- **Mobile core:** books 2–6 and the hero. The streetcar and facade fall in the wings.
- **Alt text:** "Shrey hops down seven textbooks, one per course, toward a Northeastern lecture hall in the snow."

### Stop 6 · Droid Strike Back, 1st place Omi category (SF, Nov 2025)

- **Scene, 320×128, accent cyan:**
  - San Francisco night (`nightCity`) outside.
  - Centre-right: a simulation window, a monitor-style frame with a title bar showing only the three dots and no invented text, about 176×88. It holds a cut-away burning floor: brick, burnt boards, a fire wall, and the orange boxy treaded robot with one cyan eye (Shrey confirmed this look).
  - The hero stands outside the window at left on the path ledge, wearing the Omi pendant (drawn in this scene only, while he speaks; Shrey approved this).
- **Beat (3.6 s):**
  - 0–0.5 s: he touches the pendant (speak pose). The voice bubble shows "Omi", a waveform and "Forward".
  - 0.5–0.9 s: cyan signal dots arc from the bubble into the window.
  - 0.9–1.6 s: the robot's antenna lights, its screen shows ▶, and it rolls to the fire wall. Pill: "Moving forward".
  - 1.6–2.0 s: the bubble says "Extinguish" and the signal arcs again.
  - 2.0–3.0 s: foam arcs; the wall sinks to embers. Pill: "Spraying foam".
  - 3.0–3.6 s: the robot's eye squints happy.
- **Depicts:** a-droid-build exactly. Spoken command, to Omi, to instructions, to a digital robot in a burning building. The window frame is what makes the robot read as digital (decision 2 in section 7).
- **Reuse:** WT-W `js/themes/droid.js`:
  - `flames` (49), `nightCity` (120)
  - `voiceBubble` (316), `tagPill` (337)
  - `Robot.draw` body (513–627): pull it out into `drawRobot(ctx, x, top, state)`
  - `Robot.icon` (629–648), `FireWall` drawing (693–735)
  - `fireKit` tiles (67) for the interior
  - Replace the particle foam (500–511) with deterministic arcs.
- **New poses:** speak ×2 (shared). The Omi pendant is an overlay in this module: a 1 px cord plus a 2×2 slate disc with a teal dot.
- **Card:**
  - Title "Droid Strike Back Hackathon"; dates "San Francisco · Nov 2025".
  - Lead: a-droid-build.
  - Chip (gold): 1st place, Omi category.
  - No More.
  - This needs spans in the h3 so the title and the chip each come from markup.
- **Reduced motion:** robot beside a foamed-out wall with its happy eye, hero in the speak pose with the bubble reading "Extinguish".
- **Mobile core:** the window shrinks to 128×64 at top; the hero goes below-left with the bubble to his right.
- **Alt text:** "Shrey speaks commands into an Omi wearable; a digital rescue robot on screen drives forward and puts out a fire."

### Stop 7 · Dublin High School (Aug 2021 – Jun 2025)

- **Scene, 320×128, accent red:**
  - Late dusk: the sun has set behind the gold Tri-Valley hills and only the glow remains.
  - Navy-trimmed stucco with a red covered walkway and royal-blue lockers in the left wing.
  - Centre: the commencement stage with a red/white/navy balloon arch and a red "Class of 2025" banner. The game already used this banner and Shrey approved the school colours.
- **Beat (3.2 s):**
  - 0–0.8 s: the hero walks onto the stage.
  - 0.8–1.2 s: a navy mortarboard with a red tassel pops onto his head.
  - 1.2–2.0 s: he raises a diploma scroll (victory pose plus the scroll overlay).
  - 1.6–3.2 s: four caps toss up and tumble back down.
- **Depicts:** e-dhs, the diploma.
- **Reuse:** WT-S `js/themes/dhs.js`:
  - `K` (41)
  - `dhsBackdrop` (170), with the sun disc removed and the top regraded to page navy
  - lockers (464–493)
  - stage arch, banner and skirt (627–678), `drawCap` (557–577)
- **New poses:** none shared. The mortarboard and diploma are overlays in this module.
- **Card:**
  - Title "Dublin High School"; role "High School Diploma"; dates "Dublin, CA · Aug 2021 – Jun 2025".
  - No chips, no More.
- **Reduced motion:** hero on stage in the cap, diploma raised, caps resting on the stage lip.
- **Mobile core:** the stage centre and the hero; the arch is cropped at its sides.
- **Alt text:** "Shrey crosses the Dublin High stage in a cap and raises his diploma."

### Stop 8 · EduLearn Hackathon, online, 1st of 700+ (Oct 2024)

- **Scene, 320×120, accent gold:** the giant laptop from the game. Its keyboard deck is the floor the hero stands on.
  - **Screen, left:** a gallery of exactly 700 webcam tiles, 35 columns × 20 rows at a 5×4 px pitch. One fixed tile is the hero (brown skin, black shirt).
  - **Screen, right:** a "Results" window.
  - **Title bar:** "EduLearn Hackathon · online" and a red "Live" badge.
- **Beat (2.8 s):**
  - 0–0.8 s: the results window reads "Final results".
  - 0.8 s: it switches to "1st place" and the hero's tile gets a gold rim.
  - 0.8–2.6 s: an applause highlight sweeps across the tiles and hearts float up (hearts only, since the game's star glyph is too close to Nintendo).
  - 1.0–1.6 s: the hero jumps (victory).
- **Depicts:** a-edulearn. The event was online (Shrey confirmed) and had 700+ participants. Drawing exactly 700 tiles never suggests a larger figure.
- **Reuse:** WT-S `js/themes/dhs.js`:
  - laptop lid, screen, Live badge and keyboard deck (499–553)
  - gallery prerender and applause sweep (688–767)
  - `SKINS`, `SHIRTS`, `TILEBG`, `HEART` (682–685); drop `STAR`
- **New poses:** none.
- **Card:**
  - Title "EduLearn Hackathon"; dates "Online · Oct 2024" (decision 3 in section 7).
  - Lead: the a-edulearn sentence.
  - Chip (gold): 1st of 700+.
  - No More.
- **Reduced motion:** "1st place" shown, hero's tile rimmed, hero standing.
- **Mobile core:** the gallery shrinks to 3×2 tiles on a 4×3 pitch (140×60 total), with the results window as a 140×22 band below it.
- **Alt text:** "On a 700-person video call, the results window shows 1st place and Shrey's tile lights up."

### Stop 9 · Algorithmic Trading Bot (Apr–Aug 2024)

- **Scene, 320×120, accent green:**
  - Navy terminal: chart grid and a dim candle history in the backdrop.
  - Left wing (desktop): the banner "Simulated portfolio" with "$50,000" read from p-trade-1.
  - A price rail crossing the scene, rising from left to right with small dips. Its end is always higher than its start.
  - Right: the backtest results board.
- **Beat (3.8 s):**
  - 0–0.5 s: the hero steps onto the autopilot cart and crosses his arms.
  - 0.5–3.0 s: the cart rides the rail with the pill "Autopilot · no manual input". Two text-free markers pop on the rail: a green ▲ (entry) and a red ▼ (exit).
  - 3.0–3.8 s: the board fills in "43%" over "win rate" and "2.76" over "profit factor", under the heading "Walk-forward backtests".
- **Depicts:**
  - p-trade-1: autopilot, no manual input, simulated money.
  - p-trade-3: entry and exit signals.
  - p-trade-4: both figures are parsed from the résumé at runtime.
  - **Art rule:** nothing in or near this stop may show a price line or candle moving downward under the hero. It would read as a loss.
- **Reuse:** WT-P `js/themes/trading.js`:
  - `factText` (45), `arrow` (51), `tradingBackdrop` (93–155)
  - `PortfolioBanner` (217)
  - Autopilot rail (314–320), cart (323–343) and pill (346–349)
  - `Results` (628–656)
  - Do not use `Candles` down-sinking.
- **New poses:** crossArms (shared).
- **Card:**
  - Title "Algorithmic Trading Bot"; role "Python · QuantConnect · TensorFlow · pandas · Deep RL"; dates "Apr 2024 – Aug 2024".
  - Lead: p-trade-1, which keeps "simulated" next to $50,000.
  - Chips: 43% win rate · 2.76 profit factor · Walk-forward backtests (the qualifier is always visible).
  - More: -2, -3, -4.
- **Reduced motion:** cart parked at the board, figures shown, hero with arms crossed.
- **Mobile core:** the rail compressed to 140 px, with the board overlaid at top right (64×36).
- **Alt text:** "An autopilot cart carries Shrey across a rising price line with no manual input; the board shows a 43% win rate and 2.76 profit factor."

### Stop 10 · Technical skills (5 categories, 38 skills)

- **Scene, 320×176 (taller), skill-tier palette:** a compact dusk tree on a bluff. Five 28 px bands from top to bottom, each drawn as its category:
  - gold git-graph crown reaching into clouds (tools)
  - green browser–server wire with packets (web)
  - magenta input layer and nodes (ML)
  - cyan sap streams and a scatter/histogram carved in the bark (data)
  - orange roots with code syntax pressed into the soil (languages)

  Each band has one 16×16 lit brick at its edge carrying the tier glyph (gear, window, neuron, grid, code). The hero arrives at the top commit from T8.
- **Beat (3.0 s):** the hero slides down the trunk like a fire pole. Each band lights as he passes (crown, web, ML, data, roots, 0.5 s each), and he lands in the roots.
- **Depicts:** the five category groupings, drawn as what each category is about. Shrey approved this in the game. No skill names appear in the scene; the card carries all 38.
- **Reuse:** WT-F `js/themes/tree.js`:
  - `RAMP`, `BARK`, `LEAF` (29–33)
  - `blob`, `limb`, `paintTree` (184–306), rescaled
  - `GLYPHS` (328), `brickArt` (350)
  - `RootsDecor` (553), `DataDecor.carve` (613), `NeuralDecor` (656), `WebDecor` (707)
  - `CrownDecor` `thick` and `commit` (807–825)
  - Regrade the day sky (113) to dusk.
- **New poses:** poleSlide, which is the existing victory frame placed against the trunk.
- **Card:**
  - Title "Technical skills".
  - Five groups. Each heading carries its tier brick icon and the chips use that tier's ramp.
  - Recommended: all 38 chips visible and no More (decision 6 in section 7).
  - A computed line at the top: "38 skills in 5 areas".
- **Reduced motion:** all bands lit, hero standing in the roots.
- **Mobile core:** 160×176 with the trunk centred; the bands crop at their sides.
- **Alt text:** "Shrey slides down a tree whose crown, branches, canopy, trunk and roots stand for his five skill areas."

### Stop 11 · Contact (end)

- **Scene, 320×160, accent gold:**
  - Night harbour: moon, sea, two moored boats.
  - A red and white lighthouse right of centre.
  - Along the dock, three lamp posts, each with a small hanging sign showing the envelope, card and code glyphs. These are signs, not blocks; the game's signal boxes look too much like info blocks.
- **Beat (3.4 s):**
  - 0–1.2 s: the hero walks the dock and each lamp lights as he passes.
  - 1.2–1.8 s: light runs along the cables up the tower.
  - 1.8–3.0 s: the beacon lights and one beam sweeps. It stays inside the vignette and never washes over the page.
  - 3.0–3.4 s: the hero turns and waves.
- **Depicts:** the ways to reach him. This is the game's approved metaphor, not a claim about work.
- **Reuse:** WT-F `js/themes/lighthouse.js`:
  - `PAINT` (23)
  - backdrop sky, moon, sea and boats (119–196)
  - `GLYPH` (295)
  - Signal cable routing idea (341–356)
  - lantern (482–518) and beam (520–560), without the rainbow mode
  - The tower body uses the red/white band logic.
- **New poses:** wave ×2.
- **Card:**
  - Lead: c-open.
  - Three large contact buttons from c-email, c-linkedin and c-github, using the same three glyphs as the lamps.
  - "Or play it as a 16-bit platformer ▶".
  - The existing footer line.
  - No More.
- **Reduced motion:** all three lamps lit, a steady beam at a fixed angle, hero waving (frame 1).
- **Mobile core:** the tower and the last lamp; the other two lamps sit just left of the tower.
- **Alt text:** "Shrey lights three dock lamps and the lighthouse beacon."

---

## 2. Between stops (traversals)

Heights below are desktop game px; mobile uses about 70% of each.

| # | From → to | Move | Theme link | Sections (share of the segment's scroll) | Owner |
|---|---|---|---|---|---|
| T0 | Intro → Vincio | hop off, fall, hop gaps | timeline clips | hop off the ledge (10%) · fall through a cloud wisp (30%) · three hops down staggered video clips with thumbnails and gaps (60%) | A |
| T1 | Vincio → ORNL | elevator | lab | step onto a steel cage lift (10%) · ride down while the cable pays out (80%) · step off (10%) | A |
| T2 | ORNL → Handshake | stairs that form | inverse design | four gold slider knobs on vertical tracks each drop to its value as the hero nears it, forming steps he walks down (90%) · cloud wisps (10%) | A |
| T3 | Handshake → NEU | chute slide, then drop | x-hs-1 audit | slide down a steel chute (orange trim) beside three image cards that ride down with him; the tree card's "car" tag flips to "tree ✓" as he passes it (60%) · drop through the dense cloud floor as snow begins (40%) | B |
| T4 | NEU → Droid | ride | San Francisco | **"2025"** year marker · hop onto an SF cable car on a steep diagonal and ride down hanging one-handed (85%) · hop off (15%) | B |
| T5 | Droid → DHS | slide down a slope | Tri-Valley hills | slide down a dusk golden hillside past valley-oak silhouettes, with a dust pixel trail (90%) · land under the red walkway canopy (10%) | C |
| T6 | DHS → EduLearn | cable zipline | "plugging in" to an online event | **"2024"** year marker · hang from a black cable running diagonally down to the giant laptop's port (100%) | C |
| T7 | EduLearn → Trading | stairs that form | p-trade-2 | two feed rails, "Level II order flow" (cyan) and "Microstructure" (gold); red ✕ bad ticks blink out, the rails slide into time alignment forming two steps, and dotted shared-timestamp lines appear (100%) | A |
| T8 | Trading → Skills | jump, rail slide | git (tools tier) | jump off the board ledge (15%) · slide along a cyan git branch through its commit dots as it merges into the gold main line at the crown (85%) | D |
| T9 | Skills → Contact | ladder down | roots, bluff | climb down roots knotted into a ladder on the bluff face (85%) · step onto the dock planks (15%) | D |

**How the mechanisms follow scroll.**
- In T2, T3 and T7 the mechanism is driven by the hero's distance from each element, not by time. Scrolling back up un-forms the stairs, un-aligns the feeds and flips the tag back, so every traversal is fully reversible.
- Horizontal runs are at most 64 game px on desktop and 40 on mobile, so the hero stays within 25–70% of the viewport height.

---

## 3. Top and end

- **Top:** name, role line, contact pills and `c-open` are plain DOM text. They are readable at first paint, well under 10 s, and nothing waits on canvas. Scene choreography is in stop 1.
- **End:** see stop 11. After the beat the hero idles in the wave pose. The page ends with the contact card, then the Play link and footer. The `c-open` line appears at both the top and the end.

---

## 4. Visual system

### Path and eras

Era materials on the spine hardware:

| Band | Stops | Material |
|---|---|---|
| 2026 sky | Intro, Vincio, ORNL, Handshake | light steel catwalk ledges (steel.3/4) |
| Boston | NEU | brick with snow caps |
| SF | Droid | asphalt with cable-car rails |
| Dublin | DHS | concrete walkway with red canopy posts |
| 2024 | EduLearn, Trading | black cable, then navy data rails with phosphor-green edges |
| Skills | Skills | bark and roots |
| End | Contact | dock planks |

**Wings are off by default.** Only three era transitions get a one-off silhouette at 20% or less contrast against the page:
- the cloud floor (T3)
- the hill crest (T5)
- the bluff and sea (T9)

**Year markers** are DOM text in Fredoka 600 in the `--muted` colour, left of the spine, with a 1 game-px tick. There are three:
- **2026:** above Vincio.
- **2025:** between NEU and Droid. The NEU start year isn't on the résumé, so no marker goes above it.
- **2024:** between DHS and EduLearn.

On mobile the markers sit inline above their segment.

### Palette per stop (ramps from palette.js)

| Stop | Sky (top is always `#0e1433`) | Path / chip accent | Secondary |
|---|---|---|---|
| Intro | down to indigo.0 | teal.3 | white.2 twinkles |
| Vincio | down to editor `#12141d` | cyan.2 | magenta.2, gold.2, slate.3, red.2 playhead |
| ORNL | dawn glow only inside the window | teal.2/3 | magenta.2 beads, gold.2, steel |
| Handshake | moonlit cloud tops (slate.1/2, indigo.1) | orange.2 | cyan.3 noise, white.2, green.2 / red.2 tags |
| NEU | dusk `#323d6c` → `#7a7097` | red.2 | white snow, gold.3 windows, green.1 streetcar |
| Droid | `nightCity`, glow at the horizon only | cyan.3 | orange.2 robot, red/gold flames |
| DHS | dusk, sun below the hills | red.2 | indigo.2 navy, gold.2 hills |
| EduLearn | laptop lid `#2a2d36` | gold.3 | indigo.1 tiles, green.3, red.2 Live |
| Trading | `#0b1636` | green.3 | red.2 for the ▼ marker only, cyan.2 |
| Skills | dusk indigo.1 | wood.2 | orange, cyan, magenta, green, gold tiers |
| Contact | `#060918` → `#25356c` | gold.3 | tower red/white, steel |

### Keeping it clean on dark navy

- No frames on scenes. The outer 12 px of each scene dithers into `#0e1433` using `bayer` from MAIN `js/art/draw.js`, so each scene reads as the path widening rather than a boxed image.
- No more than about 12% of a scene's pixels may be brighter than 70% luminance. Daytime skies (Handshake, tree, DHS sun) are regraded to dusk or night.
- **Cards:**
  - background `--panel` `#10142a`, 1 px `--line` border
  - 3 px left rule in the stop's accent colour
  - chips: accent .1 background with accent .3 text; figure chips use gold
- **One render scale per breakpoint** for every canvas, because font.js keeps one global text scale.

### Mobile portrait

- **Breakpoints:**
  - ≥1100 px: scale 3, scene 320 wide (960 CSS px)
  - 700–1099 px: scale 2 (640 CSS px)
  - under 700 px: scale 2, cropped to the 160-wide core (320 CSS px)
- **Path width:** 96 game px on desktop, 64 on mobile.
- **Authoring rule:** every scene is drawn so the hero's mark, the main mechanism and its labels sit inside the centred 160 px core. The 80 px wings hold only secondary props.
- On mobile the scene sits above the full-width card (16 px padding), chips wrap, and More is at least 44 px tall.

---

## 5. Reduced motion

- Each stop shows its key-pose frame, listed under "Reduced motion" in section 1, with its mechanism in the resolved state.
- The hero appears only in scenes, not in traversals.
- Traversal hardware is drawn in its formed state: sliders set, feeds aligned, tag flipped. That way they read as diagrams.
- Path dots are all cream; there is no progress colouring.
- No loops: no playhead sweep, LED blink, snowfall or beam sweep.

---

## 6. Hero poses (shared pose pack, step 0)

Done once in MAIN `js/art/sprites/hero.js`:
- Export HEAD, T_*, L_*, CROUCH and the build function.
- Add the shared poses:

| Pose | Composition | Used in |
|---|---|---|
| wave ×2 | HEAD with hand pixels at cols 12–13, rows 2–4, plus T_UP | Intro, Contact |
| point | HEAD + T_FWD + L_STAND | ORNL, Handshake |
| type ×2 | T_FWD with the hand pixel alternating 1 px | Vincio |
| crossArms | T_IDLE with a forearm band across row 3 | Trading |
| speak ×2 | HEAD_TALK (mouth open, row 7) + hand at chest, rows 1–2 | Droid |
| climb ×2 | T_UP + L_RUN2, alternating with T_FWD + L_RUN4 | T9 |
| hang | T_UP + L_FALL | T6 |
| hang, one hand | T_UP + L_STAND | T4 |
| lookDown | the idle frame-2 offset | Intro |

Slides use the existing crouch and skid frames. poleSlide uses the existing victory frame.

Overlays that belong to a single scene stay in that builder's module: Omi pendant, mortarboard, diploma, stamp.

---

## 7. Builder split

**Step 0** is one short commit by D, or by the engine planner, before the others start:
- the pose pack
- export `LANDMARK` from MAIN `js/art/mapart.js`
- a shared helper file: dither-edge fade, era ledge drawing, spine dots

After step 0, nobody edits hero.js, mapart.js or palette.js.

**A · Projects + Lab** (sources: WT-P and MAIN setpieces). Owns Vincio, ORNL, Trading, T0, T1, T2, T7.
- Port vincio.js (agents, `drawClip`, `Cut`, `Caption`, the browser window) and trading.js (`Autopilot` drawing, `Align`, `Results`, `PortfolioBanner`, `factText`).
- Use MAIN `Assembly`, `RunBar`, `Browsers`, `Sliders` and `Lifts` with the fake-level shim.
- Rename RunBar's label to "Run".
- Figures are only ever parsed from index.html.
- No downward price imagery anywhere near Trading.
- Done when: each scene is legible in 3 s, the 160-wide core crop works, and the key pose and alt text exist.

**B · Work** (source: WT-W). Owns Handshake, Droid, T3, T4.
- Port the Handshake gallery regen (`paintHand`, `paintSign`, `paintCube`, `bake`, `noiseCol`, `drawImage`), `drawCard` and `drawTag` for the chute.
- Regrade `factorySky` to night.
- Pull `Robot.draw` out into a pure function and put the burning building inside a simulation window.
- Draw the Omi pendant only while the hero speaks.
- Use the exact label "Fine-tuned on my annotations".
- Draw a new small SF cable car; neu.js's streetcar body is a structural reference.
- Done when: everything meets the same checks as A.

**C · School** (source: WT-S). Owns NEU, DHS, EduLearn, T5, T6.
- Port neu.js (streetcar, facade, textbooks with `GLYPHS`, flakes) and dhs.js (laptop, 700-tile gallery, stage, `drawCap`, hills).
- Draw exactly 700 tiles, hearts only.
- Remove the DHS sun disc.
- Book names come from `[data-credit]`.
- Owns the mortarboard and diploma overlays.

**D · Bookends + pose pack** (source: WT-F). Owns step 0, Intro, Skills, Contact, T8, T9.
- Compress tree.js into a 320×176 five-band tree using its decor classes and `brickArt`.
- Port lighthouse.js (backdrop, lantern, beam, `GLYPH`).
- Use hanging signs instead of signal boxes. No rainbow beam.
- Produce the tier icons for the skills card headings.

---

## 8. Decisions that still need Shrey

The four levels-work questions and the card format are already decided and applied above.

1. **Top one-liner.** The game title's "ML research @ Oak Ridge National Lab" is now out of date: ORNL ended in May 2026. *Recommend* "Computer Science + Computer Engineering at Northeastern University. Machine learning research, AI tools, and hackathon builds." from `resume__tag`, leaving "Based in Dublin, CA" out of the one-liner.
2. **Droid as a digital robot.** Show the burning building inside a simulation window so the robot doesn't read as physical hardware. *Recommend yes.* The bullet says "digital robot".
3. **Markup changes for the cards:**
   - EduLearn becomes its own entry dated "Online · Oct 2024". It was online, as Shrey confirmed.
   - The Droid h3 gets spans so the title is "Droid Strike Back Hackathon" and the chip is "1st place, Omi category".
   - `data-chip` and `data-lead` attributes get added.

   *Recommend yes.* The printed résumé reads exactly the same.
4. **Lead bullets.** Vincio -1, ORNL -1 (GNNs, rather than -2, the web tool), Handshake -2 (fine-tuning, rather than -1, labelling), Trading -1. *Recommend as listed*, since each lead is the bullet its scene's main beat depicts.
5. **Skills card.** All 38 chips visible, or a few per group plus More? *Recommend all visible.* It's the list recruiters scan for.
6. **Year markers** at 2026 / 2025 (after NEU) / 2024. *Recommend these positions.* The alternative is no markers at all.

---

### Critical Files for Implementation
- /Users/shreyvalia/Desktop/personal portfolio/index.html
- /Users/shreyvalia/Desktop/personal portfolio/js/art/sprites/hero.js
- /Users/shreyvalia/Desktop/personal portfolio/js/game/setpieces.js
- /Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-work-4eb2b4/js/themes/droid.js
- /Users/shreyvalia/Desktop/personal portfolio/.claude/worktrees/levels-projects-f655f6/js/themes/vincio.js
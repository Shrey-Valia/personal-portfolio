# Questions for Shrey: Tech Tree and Lighthouse

Branch `claude/levels-finale-9cd67c`. Four decisions, each with my pick.
All four are now decided; the outcome is under each question.

## 1. Where should "Open to work" appear?

The line is `c-open` ("Open to summer 2027 internships in machine learning
and software engineering"), which was flagged as an inference. It was
the brass plaque on the lighthouse lantern: its card opens just before the
beacon lights. It didn't appear on the end screen.

- **A.** Plaque only (current).
- **B.** Plaque, plus one line on the end screen under "Thanks for playing",
  right above the email button.
- **C.** Take it out until you confirm the wording.

**Pick: B, once you confirm the sentence is accurate.** The end screen is
where a recruiter decides to write to you, so that's where this line helps
most. If it isn't accurate, C.

**Decided: B.** Shrey confirmed the sentence as written, so the
`data-flag="inference"` attribute is gone from index.html and the end screen
shows the `c-open` text above the contact buttons. (It only shows when that
flag is absent, so re-flagging the line hides it again.)

## 2. Should the skill bricks be required?

All 38 bricks are optional now. Reaching the tree top clears the level with
any count, and a toast says how many skills are still on the tree. Each tier
that is fully collected shows "Maxed ✓".

- **A.** Optional (current).
- **B.** Each tier's next branch appears only once its bricks are all hit.
- **C.** Optional, but the crown blooms only at 38/38.

**Pick: A.** Hitting 38 bricks takes about a minute. A recruiter who just
wants the five category cards shouldn't have to grind, and every skill is
also in the résumé.

**Decided: A.** No change.

## 3. Is a git graph the right picture for "Tools and infrastructure"?

Each tier is drawn as its category: roots with code syntax in the soil
(languages), data streaming up the trunk with a scatter plot and histogram
carved in the bark (data), the bricks as the input layer of a neural
network (ML), and a browser and a server trading packets on a wire (web).
The crown's top branches are a git graph (commits, a branch, a merge) that
reaches into clouds.

- **A.** Git graph plus clouds (current).
- **B.** Stacked shipping containers on the top branch (Docker).
- **C.** A workbench with tools.

**Pick: A.** Every reader recognizes git, and the clouds stand in for AWS
without using a logo.

**Decided: A.** No change.

## 4. Is the Lighthouse long enough?

A first visit takes about 35–45 s with its four cards: dock, three signal
boxes, a ten-landing spiral stair, the plaque, then the beacon. That's under
the 50 s floor in the level contract, on purpose, so contact info comes
quickly.

- **A.** Keep it short (current).
- **B.** Add a harbor stretch before the tower (a pier, a couple of gull
  bugs) to reach about 60 s.

**Pick: A.** It's the contact level and it's open from the start. Short is
the point.

**Decided: A.** No change.

## Notes, no decision needed

- The end screen reads the email, LinkedIn and GitHub links from the
  `c-email` / `c-linkedin` / `c-github` items in index.html, so it already
  uses the fixed LinkedIn URL from game-v2 (checked against that markup).
- README's "Before you publish" list still asks Shrey to confirm this line.
  It's confirmed now, so a merger can drop that item. I left the README
  alone because game-v2 rewrote the same list and an edit here would conflict.
- The end screen's time stat is "This visit": time since the page opened.
  The game doesn't track total play time yet. If you want real play time,
  that's a small addition to progress.js.

# Questions for Shrey: Vincio Studio and Trading Floor

Both levels are playable start to finish (`?level=vincio`, `?level=trading`).
These were four taste and content calls. Shrey said to decide them as I
saw fit (2026-10-20), so each now records what was decided.

| # | Question | Decision |
|---|---|---|
| 1 | Name the asset classes on the autopilot ride? | **A, unnamed.** The résumé doesn't name them. |
| 2 | Backstage: built vs contributed? | **B, done.** Front end and agent layer are tagged "Built"; database, auth and agent memory "Contributed". The tags appear once the stack powers up. |
| 3 | What does the text agent type? | **A, "On-screen text".** |
| 4 | Goal labels? | **A, Export and Execute.** The "Simulated portfolio" banner already frames the trades as simulated. |

The original questions follow for reference.

## 1. Trading: should the autopilot ride name the asset classes?

Your bullet says the agent traded "across multiple asset classes" but
doesn't say which. Right now the ride passes three unlabeled mini-charts
(a line, bars, candles) under one caption: "Multiple asset classes".

- **A. Keep them unnamed** (what's built).
- **B. Label each panel** with the real classes (for example equities,
  forex, crypto, whichever you actually traded). If you pick this, add the
  names to the bullet in `index.html` too, so the level reads them from the
  résumé like every other figure.

**Recommendation: A**, unless you want the classes on the résumé itself. In
that case B, with the names coming from `index.html`.

## 2. Vincio Backstage: show "built" vs "contributed"?

Your bullet separates what you **developed** (front end, agent layer) from
what you **contributed to** (database, auth, agent memory). In Backstage,
logging the fact powers up all five parts the same way, which could read
as "I built all of this."

- **A. Keep it uniform** (what's built).
- **B. Tag them:** front end and agent layer get a "Built" badge; database,
  auth and agent memory get "Contributed".
- **C. Light only the two you built**, and leave the other three dim but
  labeled.

**Recommendation: B.** It matches the bullet word for word and still shows
the whole stack.

## 3. Vincio: what should the text agent type?

The on-screen-text agent types a caption letter by letter, and the caption
becomes the bridge. It currently types the capability itself: "On-screen text".

- **A. Keep "On-screen text"** (what's built). It's literal and reads instantly.
- **B. A real title or caption** from a cut Vincio produced (you'd supply it).
- **C. "Final cut"**, which ties into the export file at the end.

**Recommendation: A**, unless you have a real caption you like. Then B.

## 4. Goal button labels: "Export" and "Execute"?

Vincio ends on **Export** (a render bar fills to `final_cut.mp4 ✓`).
Trading ends on **Execute**, right after the backtest results board.

- **A. Keep Export / Execute** (what's built).
- **B. Trading uses "Run backtest"** so no one reads it as live trading.
- **C. Trading uses "Closing bell".**

**Recommendation: A for Vincio. For Trading, A or B.** The portfolio was
simulated, so if "Execute" feels like it implies live trading, B is the
safer claim.

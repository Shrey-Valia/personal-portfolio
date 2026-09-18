# Shrey Valia — portfolio

Single-page static site. No framework, no build step, no dependencies.

```
index.html    content + which figure each section shows
styles.css    design system
main.js       the field (6 figures) + scroll motion
```

## Before you publish

1. **Confirm the LinkedIn URL.** The site links `linkedin.com/in/shrey-valia`,
   taken from your updated resume. Earlier you pasted
   `linkedin.com/in/shrey-valia-7a0041267`. Those are different. If the short
   vanity URL isn't actually set on your profile, the link 404s — open it once
   and check, then fix `index.html` if needed.
2. **"Open to summer 2027 internships"** in Contact is my inference from your
   class year, not something your resume says. Change or delete it.

Your phone number is deliberately not on the page. A resume goes to people you
choose; a website gets crawled. Add it to the hero if you want it public.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173 — or just open `index.html` directly, since
everything is relative paths and a classic script tag.

## Deploy

```bash
git init && git add -A && git commit -m "Portfolio" && gh repo create shreyvalia.github.io --public --source=. --push
```

GitHub Pages serves `<username>.github.io` from the repo root. Netlify and
Vercel both work by dropping the folder in.

## The design

**Deep-space minimal.** One dark continuum, very large light type, enormous
negative space, and a live 3D figure behind the copy.

**Colour is viridis** — the colormap in every matplotlib figure your work
produces. It encodes *position along a sequence*: along the polymer backbone in
the field, and down the page for section accents. Labels only ever use the
bright half of the ramp, because violet and indigo can't hold 4.5:1 on black.

**Type.** Sora at weight 200 for display, IBM Plex Mono for labels, data and
captions. Two families, no default stacks.

## The field — 6 figures, one node set

The figure behind the page isn't decoration, and it isn't the same shape
everywhere. 38 monomers rearrange into a different topology per section, each
one depicting that section's actual subject:

| Figure | Where | What it is |
|---|---|---|
| 1 Chain | Hero, ORNL | 3D self-avoiding walk — a polymer that can't pass through itself |
| 2 Diffusion | Handshake AI | Noise on the left resolving into a clean grid on the right |
| 3 Agents | Vincio | Four agents on a shared spine, each with its own capabilities |
| 4 Series | Trading bot | An equity curve: near-planar, trending up, with drawdowns |
| 5 Ladder | Record | A timeline climbing in discrete steps |
| 6 Lattice | Toolkit | A regular 3D grid — order, nothing emergent |
| 7 Converge | Contact | Collapsed to a point |

Everything is projected with perspective and drawn back-to-front, so depth
reads. Scroll drives rotation, scale and drift. Positions morph between
figures with a per-node stagger while the two edge sets crossfade. The readout
in the bottom-left names whatever is currently on screen.

To change which figure a section shows, edit its `data-figure` attribute in
`index.html`. To add one, add a generator to `GEN` and a label to `FIGURES` in
`main.js`.

## Quality floor

These are verified, not aspirational:

- **No-JS safe.** Reveal states are gated behind a `.js` class, so with
  JavaScript off every section renders at full opacity. Measured: 0 hidden
  elements.
- **WCAG AA.** All 24 text styles pass 4.5:1 (or 3:1 where large) on the
  deep-space ground.
- **12px type floor.** No text renders below 12px. Enforced via `--fs-label`.
- **44px tap targets.** Contact links are whole-cell anchors; nav and button
  hit areas are grown with padding offset by negative margin, so the visual
  position doesn't move.
- **Reduced motion respected.** The field renders assembled and still; all
  reveals resolve instantly.
- **No horizontal scroll** at 375px.

## Editing content

Each role and project is an `<article class="entry">`. To add a metric:

```html
<div class="metric">
  <dt>Label</dt>
  <dd data-count-to="92" data-suffix="%">92%</dd>
</div>
```

The text inside `<dd>` is the no-JS fallback, so write the final value there.
`data-decimals`, `data-prefix` and `data-suffix` are optional.

Content is transcribed from `Shrey_Resume.pdf`. When the resume changes, mirror
it here — the site has no other source.

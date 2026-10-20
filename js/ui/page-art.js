// The website's chrome, built from the résumé and the timeline's stops so
// nothing is typed twice: the bar (Shrey's head as the mark, a link per
// section into the timeline, Résumé PDF) and the "Play the game" line in
// the footer. The timeline itself is js/site/timeline.js. Everything here
// is .page-only: the in-game dialog hides it, and without JS the plain
// résumé shows on its own.

import { STOPS } from '../site/api.js';
import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

// the bar's sections, in this order; each links to the first stop that claims it
const NAV = ['Experience', 'Projects', 'Education', 'Skills', 'Contact'];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// where a stop's link lands: its anchor, else the id of the node it moves in
function anchorOf(stop) {
  if (stop.anchor) return stop.anchor;
  const n = typeof stop.node === 'string' && document.querySelector('#resume ' + stop.node);
  return n && n.id ? n.id : null;
}

export function decoratePage(game) {
  const A = game.art;
  const resume = $('resume');

  // ─── the bar: Shrey's head as the mark, links into the timeline ────
  const [mk, kctx] = makeCanvas(18, 15);                        // the head, with outline and rim
  kctx.drawImage(A.hero.idle[0].c, 0, 0, 18, 15, 0, 0, 18, 15);
  mk.className = 'pagebar__mark';
  mk.setAttribute('aria-hidden', 'true');
  $('pagebar-brand').prepend(mk);

  const nav = $('pagebar-links');
  for (const label of NAV) {
    const stop = STOPS.find((s) => s.nav === label);
    const id = stop && anchorOf(stop);
    if (!id) continue;
    const a = el('a', null, label);
    a.href = '#' + id;
    nav.appendChild(a);
  }
  $('pagebar-pdf').addEventListener('click', () => window.print());

  // ─── the game, one quiet line at the end ───────────────────────────
  const foot = resume.querySelector('.resume__foot');
  if (foot) {
    const p = el('p', 'foot-play page-only', 'Prefer to play? The same résumé is a 16-bit platformer. ');
    const a = el('a', null, 'Play the game ▶');
    a.href = '#play';
    p.appendChild(a);
    foot.prepend(p);
  }
}

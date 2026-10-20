// The website's extras, all built from the résumé markup and the game's own
// data and art, so nothing is typed twice: the split hero (Shrey on one
// half, the game's island on the other), the snapshot card (from
// [data-snap]), the numbers band (from [data-stat] plus the skill count),
// each section's landmark with the game's caption for that place, and the
// closing contact block. Everything here is .page-only: the in-game dialog
// hides it, and without JS the plain résumé shows on its own.

import { NODES, EDGES } from '../game/map.js';
import { LEVELS } from '../game/levels/index.js';
import { drawPath, drawBeam } from '../art/mapart.js';
import { disc } from '../art/draw.js';
import { drawFrame } from '../art/sprite.js';
import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

// where each map place lives on the page; the rest use their node id
export const ANCHOR = { home: 'resume', lighthouse: 'h-contact', tree: 'skills' };

const SNAP_ORDER = ['University', 'Degree', 'Graduating', 'Based in', 'Research'];
const STAT_ORDER = ['droid', 'dhs', 'trading'];          // honors lead the numbers

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function crop(src, x, y, w, h, cls) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
  c.className = cls;
  c.setAttribute('aria-hidden', 'true');
  return c;
}

function rank(order, key) {
  const i = order.indexOf(key);
  return i < 0 ? order.length : i;
}

// the game's own caption for a place: the level's title and sub when it
// has a level, the map's otherwise
function caption(id) {
  const def = LEVELS[id], n = NODES[id];
  const pop = el('span', 'landmark__pop');
  pop.append(el('b', null, (def && def.title) || n.name), el('span', null, (def && def.sub) || n.sub));
  return pop;
}

export function decoratePage(game) {
  const A = game.art;
  const resume = $('resume');
  const head = resume.querySelector('.resume__head');
  const foot = resume.querySelector('.resume__foot');
  const landmarks = [];

  // ─── landmarks: a tile beside list entries, a strip atop cards ─────
  // cropped from the plain island (road dots are noise at this size)
  function landmark(id, host) {
    const n = NODES[id];
    const card = !!host.closest('.resume__section--cards');
    const mark = el('span', (card ? 'landmark landmark--card' : 'landmark') + ' page-only');
    mark.appendChild(card
      ? crop(A.mapBase, n.x - 64, n.y - 46, 128, 44, 'landmark__art')      // sky on top for the caption
      : crop(A.mapBase, n.x - 24, n.y - 36, 48, 36, 'landmark__art'));
    mark.appendChild(caption(id));
    host.prepend(mark);
    host.classList.add(card ? 'has-card-art' : 'has-tile');
    landmarks.push(mark);
  }
  for (const id of Object.keys(NODES)) {
    const host = resume.querySelector(`.entry[data-node="${id}"], .skills[data-node="${id}"]`);
    if (host) landmark(id, host);
  }

  // ─── hero, website half: portrait and short contact links ──────────
  const slot = $('portrait');
  if (slot) {
    // Shrey on the road beside his house, framed for a round crop
    const h = NODES.home;
    const [pc, pctx] = makeCanvas(48, 48);
    pctx.drawImage(A.mapBase, h.x - 18, h.y - 36, 48, 48, 0, 0, 48, 48);
    drawFrame(pctx, A.hero.idle[0], 27, 15, false, 10);
    pc.className = 'portrait__pixel';
    pc.setAttribute('role', 'img');
    pc.setAttribute('aria-label', 'Pixel-art Shrey outside his house on Shrey Island');
    slot.appendChild(pc);
    slot.classList.add('page-only');
  }

  // the email in full, LinkedIn and GitHub by name; the full addresses
  // close the page in the contact block
  const links = el('ul', 'hero-links page-only');
  for (const li of resume.querySelectorAll('#contact > li')) {
    const a = li.querySelector('a').cloneNode(true);
    if (!a.href.startsWith('mailto:')) a.textContent = li.dataset.title;
    const item = el('li');
    item.appendChild(a);
    links.appendChild(item);
  }
  resume.querySelector('#contact').after(links);

  // ─── hero, game half: the island as a section index, and the way in ─
  const [roads, rctx] = makeCanvas(480, 216);
  rctx.drawImage(A.mapBase, 0, 0);
  for (const e of EDGES) {
    if (e.beam) drawBeam(rctx, e.pts, 0, true, 0);
    else drawPath(rctx, e.pts, 0, 'open', 0);
  }
  for (const n of Object.values(NODES)) { disc(rctx, n.x, n.y, 5, 'ink.0'); disc(rctx, n.x, n.y, 4, 'red.2'); }
  drawFrame(rctx, A.hero.idle[0], NODES.home.x - 5, NODES.home.y - 20, false, 10);
  roads.setAttribute('aria-hidden', 'true');

  const gameHalf = el('section', 'hero-game page-only');
  gameHalf.setAttribute('aria-labelledby', 'h-game');
  const fig = el('figure', 'pagemap');
  const art = el('div', 'pagemap__art');
  art.appendChild(roads);
  const pins = el('nav', 'pagemap__pins');
  pins.setAttribute('aria-label', 'Map of the sections');
  for (const [id, n] of Object.entries(NODES)) {
    const a = el('a', 'pagemap__pin', n.name);
    a.href = '#' + (ANCHOR[id] || id);
    a.title = n.sub;
    a.style.left = (n.x / 480) * 100 + '%';
    a.style.top = ((n.y > 100 ? n.y + 7 : n.y + 13) / 216) * 100 + '%';
    pins.appendChild(a);
  }
  art.appendChild(pins);
  fig.appendChild(art);
  function gameText() {
    const p = el('p', 'hero-game__text', 'The same résumé as a 16-bit platformer: each landmark on Shrey Island is a level built from one part of this page.');
    p.appendChild(el('span', 'hero-game__hint', ' Pick a place on the map to jump to its section here.'));
    return p;
  }
  const go = el('a', 'pbtn pbtn--primary', 'Play the game ▶');
  go.href = '#play';
  gameHalf.append(
    fig,
    Object.assign(el('h2', 'hero-game__title', 'Or play it as a game'), { id: 'h-game' }),
    gameText(),
    go,
  );
  head.appendChild(gameHalf);

  // ─── snapshot ──────────────────────────────────────────────────────
  const snaps = [...resume.querySelectorAll('[data-snap]')]
    .sort((a, b) => rank(SNAP_ORDER, a.dataset.snap) - rank(SNAP_ORDER, b.dataset.snap));
  if (snaps.length) {
    const dl = el('dl', 'snapshot page-only');
    for (const s of snaps) {
      const row = el('div', 'snapshot__row');
      row.dataset.key = s.dataset.snap;
      row.append(el('dt', null, s.dataset.snap), el('dd', null, s.textContent.trim()));
      dl.appendChild(row);
    }
    head.appendChild(dl);
  }

  // ─── by the numbers ────────────────────────────────────────────────
  const stats = [...resume.querySelectorAll('[data-stat]')].map((s) => {
    const home = s.closest('[id]');
    return { value: s.textContent.trim(), label: s.dataset.stat, href: '#' + home.id, at: home.id };
  }).sort((a, b) => rank(STAT_ORDER, a.at) - rank(STAT_ORDER, b.at));
  stats.push({
    value: String(game.content.skills.length),
    label: `technical skills in ${resume.querySelectorAll('.skillset').length} areas`,
    href: '#skills',
  });
  const band = el('section', 'numbers page-only');
  band.setAttribute('aria-label', 'By the numbers');
  band.appendChild(el('p', 'numbers__kicker', 'By the numbers'));
  const grid = el('div', 'numbers__grid');
  for (const s of stats) {
    const a = el('a', 'stat');
    a.href = s.href;
    a.append(el('b', 'stat__value', s.value), el('span', 'stat__label', s.label));
    grid.appendChild(a);
  }
  band.appendChild(grid);
  head.after(band);

  // ─── contact, at the end: the same links in full ───────────────────
  const contact = el('section', 'resume__section contactend page-only');
  contact.setAttribute('aria-labelledby', 'h-contact');
  const h2 = Object.assign(el('h2', null, 'Contact'), { id: 'h-contact' });
  const wrap = el('div', 'contactend__wrap');
  const open = resume.querySelector('[data-fact="c-open"]');
  if (open) wrap.appendChild(el('p', 'contactend__lead', open.textContent.trim()));
  const list = el('ul', 'contactend__links');
  for (const a of resume.querySelectorAll('#contact a')) {
    const li = el('li');
    li.appendChild(a.cloneNode(true));
    list.appendChild(li);
  }
  wrap.appendChild(list);
  contact.append(h2, wrap);
  foot.before(contact);
  landmark('lighthouse', wrap);

  // ─── the bar: Shrey's head as the mark, links from the headings ────
  const [mk, kctx] = makeCanvas(16, 13);
  kctx.drawImage(A.hero.idle[0].c, 0, 0, 16, 13, 0, 0, 16, 13);
  mk.className = 'pagebar__mark';
  mk.setAttribute('aria-hidden', 'true');
  $('pagebar-brand').prepend(mk);
  const nav = $('pagebar-links');
  for (const hd of resume.querySelectorAll('.resume__section > h2[id]')) {
    const a = el('a', null, hd.dataset.nav || hd.textContent);
    a.href = '#' + hd.id;
    nav.appendChild(a);
  }
  $('pagebar-pdf').addEventListener('click', () => window.print());

  resume.classList.add('has-art');
  return { landmarks };
}

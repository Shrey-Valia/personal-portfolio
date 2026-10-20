// The website's extras, all built from the résumé markup and the game's art
// so nothing is typed twice: the pixel portrait, the snapshot card (from
// [data-snap]), the numbers band (from [data-stat] plus the skill count),
// landmark art per section, the island map as a section index, and the
// closing contact block. Everything here is .page-only: the in-game dialog
// hides it, and without JS the plain résumé shows on its own.

import { NODES, EDGES } from '../game/map.js';
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

// the >_ block that turns into a check once the section has been read
function badge(items) {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.drawImage(items.info[0].c, 0, 0);
  c.className = 'info-badge';
  c.setAttribute('aria-hidden', 'true');
  c.markUsed = () => { ctx.clearRect(0, 0, 16, 16); ctx.drawImage(items.used.c, 0, 0); };
  return c;
}

export function decoratePage(game) {
  const A = game.art;
  const resume = $('resume');
  const head = resume.querySelector('.resume__head');
  const foot = resume.querySelector('.resume__foot');
  const badges = new Map();             // section element → its badge

  // the island with every road open, for the map: the page shows everything
  const [roads, rctx] = makeCanvas(480, 216);
  rctx.drawImage(A.mapBase, 0, 0);
  for (const e of EDGES) {
    if (e.beam) drawBeam(rctx, e.pts, 0, true, 0);
    else drawPath(rctx, e.pts, 0, 'open', 0);
  }

  // ─── landmark art: a tile beside list entries, a strip atop cards ──
  // (cropped from the plain island: road dots are noise at this size)
  for (const [id, n] of Object.entries(NODES)) {
    const host = resume.querySelector(`.entry[data-node="${id}"], .skills[data-node="${id}"]`);
    if (!host) continue;
    const card = !!host.closest('.resume__section--cards');
    const mark = el('span', card ? 'card-art page-only' : 'node-mark page-only');
    mark.appendChild(card
      ? crop(A.mapBase, n.x - 64, n.y - 40, 128, 44, 'card-art__img')
      : crop(A.mapBase, n.x - 24, n.y - 36, 48, 36, 'node-tile'));
    const b = badge(A.items);
    mark.appendChild(b);
    host.prepend(mark);
    host.classList.add(card ? 'has-card-art' : 'has-tile');
    badges.set(host, b);
  }

  // ─── hero: portrait, a quiet way into the game, the snapshot ───────
  const slot = $('portrait');
  if (slot && !slot.querySelector('img')) {
    // Shrey on the road beside his house, framed for a round crop
    const h = NODES.home;
    const [pc, pctx] = makeCanvas(48, 48);
    pctx.drawImage(A.mapBase, h.x - 18, h.y - 36, 48, 48, 0, 0, 48, 48);
    drawFrame(pctx, A.hero.idle[0], 27, 15, false, 10);
    pc.className = 'portrait__pixel';
    pc.setAttribute('role', 'img');
    pc.setAttribute('aria-label', 'Pixel-art Shrey outside his house on Shrey Island');
    slot.appendChild(pc);
  }
  if (slot) slot.classList.add('page-only');

  const play = el('p', 'hero-play page-only');
  const playLink = el('a', 'pbtn pbtn--small', 'Play the game ▶');
  playLink.href = '#play';
  play.append(playLink, el('span', 'hero-play__note', 'The same résumé, as a 16-bit platformer.'));
  resume.querySelector('#contact').after(play);

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
  stats.push({ value: String(game.content.skills.length), label: `technical skills in ${resume.querySelectorAll('.skillset').length} areas`, href: '#skills' });
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

  // ─── the island as a visual index, and the way into the game ───────
  const [map, mctx] = makeCanvas(480, 216);
  mctx.drawImage(roads, 0, 0);
  for (const n of Object.values(NODES)) { disc(mctx, n.x, n.y, 5, 'ink.0'); disc(mctx, n.x, n.y, 4, 'red.2'); }
  drawFrame(mctx, A.hero.idle[0], NODES.home.x - 5, NODES.home.y - 20, false, 10);
  map.setAttribute('aria-hidden', 'true');

  const island = el('section', 'island page-only');
  island.setAttribute('aria-labelledby', 'h-island');
  const text = el('div', 'island__text');
  text.append(
    Object.assign(el('h2', 'island__title', 'This résumé is also a game'), { id: 'h-island' }),
    el('p', null, 'Each landmark on Shrey Island is a level built from one part of this page. Pick a place on the map to jump to its section, or play through them.'),
  );
  const go = el('a', 'pbtn pbtn--primary', 'Play the game ▶');
  go.href = '#play';
  text.appendChild(go);
  const fig = el('figure', 'pagemap');
  const art = el('div', 'pagemap__art');
  art.appendChild(map);
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
  island.append(text, fig);
  foot.before(island);

  // ─── contact, again at the end: the same links, bigger ─────────────
  const contact = el('section', 'resume__section contactend page-only');
  contact.setAttribute('aria-labelledby', 'h-contact');
  contact.dataset.node = 'lighthouse';
  const h2 = Object.assign(el('h2', null, 'Contact'), { id: 'h-contact' });
  const body = el('div', 'contactend__body');
  const open = resume.querySelector('[data-fact="c-open"]');
  if (open) body.appendChild(el('p', 'contactend__lead', open.textContent.trim()));
  const list = el('ul', 'contactend__links');
  for (const a of resume.querySelectorAll('#contact a')) {
    const li = el('li');
    li.appendChild(a.cloneNode(true));
    list.appendChild(li);
  }
  body.appendChild(list);
  const lh = NODES.lighthouse;
  const mark = el('span', 'node-mark page-only');
  mark.appendChild(crop(A.mapBase, lh.x - 24, lh.y - 36, 48, 36, 'node-tile'));
  const wrap = el('div', 'contactend__wrap has-tile');
  wrap.append(mark, body);
  contact.append(h2, wrap);
  foot.before(contact);

  // ─── the bar: Shrey's head as the mark, links from the headings ────
  const [mk, kctx] = makeCanvas(16, 13);
  kctx.drawImage(A.hero.idle[0].c, 0, 0, 16, 13, 0, 0, 16, 13);
  mk.className = 'pagebar__mark';
  mk.setAttribute('aria-hidden', 'true');
  $('pagebar-brand').prepend(mk);
  const links = $('pagebar-links');
  for (const h of resume.querySelectorAll('.resume__section > h2[id]')) {
    const a = el('a', null, h.dataset.nav || h.textContent);
    a.href = '#' + h.id;
    links.appendChild(a);
  }

  resume.classList.add('has-art');
  return { badges };
}

function rank(order, key) {
  const i = order.indexOf(key);
  return i < 0 ? order.length : i;
}

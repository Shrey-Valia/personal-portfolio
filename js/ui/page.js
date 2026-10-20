// The page view: the same <main id="resume"> as a scrollable portfolio, no
// playing needed. The hash picks the view: #play is the game, any other
// hash (#page, or a section id like #ornl) is the page, and no hash is the
// default from boot.js. The toggles are plain links, so Back works too.
//
// It also draws the page's pixel art from the game's own: the island map
// with every road open, and each section's landmark as a tile.

import { FLAGS } from '../config.js';
import { NODES, EDGES } from '../game/map.js';
import { drawPath, drawBeam } from '../art/mapart.js';
import { disc } from '../art/draw.js';
import { drawFrame } from '../art/sprite.js';
import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

// where each map place lives in the résumé; the rest use their node id
const ANCHOR = { home: 'resume', lighthouse: 'contact', tree: 'skills' };

export function createPage({ game, display, defaultView }) {
  const root = document.documentElement;
  const resume = $('resume');
  const titleEl = $('title');
  let on = false;

  decorate();

  // the game must not read keys while the page is up: arrows and space scroll
  document.addEventListener('keydown', (e) => { if (on) e.stopPropagation(); }, true);
  window.addEventListener('hashchange', () => sync());
  window.addEventListener('popstate', () => sync());

  function wanted() {
    const h = location.hash.slice(1);
    if (h === 'play') return 'game';
    if (h) return 'page';
    return FLAGS.level ? 'game' : defaultView;
  }

  function target() {
    const h = decodeURIComponent(location.hash.slice(1));
    const el = h && h !== 'page' && document.getElementById(h);
    return el && resume.contains(el) ? el : null;
  }

  function sync(initial = false, quiet = false) {
    if (wanted() === 'page') show(initial); else hide(quiet);
  }

  function show(initial) {
    if (on) return;
    on = true;
    game.ui.resume.close();
    game.ui.dialogs.closeAll();
    game.ui.resume.home();
    game.input.clear();
    game.pause('page');
    game.loop.stop();
    game.audio.suspend();
    root.classList.add('view-page');
    const el = target();
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    else if (!initial) window.scrollTo({ top: 0, behavior: 'instant' });
    if (!initial) resume.focus({ preventScroll: true });
  }

  // back in a level: start paused, the way returning to the tab does
  function hide(quiet) {
    root.classList.remove('view-page');
    if (!on) return;
    on = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    display.fit();                     // the stage had no size while hidden
    game.resume('page');
    game.loop.start();
    game.audio.resume();
    if (!titleEl.hidden) $('title-play').focus({ preventScroll: true });
    else if (quiet || !game.openPause()) game.focusStage();
  }

  // switch from code; quiet skips the pause menu when a warp follows
  function go(view, quiet = false) {
    const url = view === defaultView ? location.pathname + location.search : view === 'page' ? '#page' : '#play';
    history.pushState(null, '', url);
    sync(false, quiet);
  }

  // the résumé dialog was asked for while the page is up: show the place here
  function reveal(node) {
    const el = node && (document.getElementById(ANCHOR[node] || node) || resume.querySelector(`[data-node="${node}"]`));
    if (el) el.scrollIntoView({ block: 'start' });
  }

  // ─── art ─────────────────────────────────────────────────────

  function decorate() {
    const A = game.art;

    // the island with every road open: the page shows everything
    const [roads, rctx] = makeCanvas(480, 216);
    rctx.drawImage(A.mapBase, 0, 0);
    for (const e of EDGES) {
      if (e.beam) drawBeam(rctx, e.pts, 0, true, 0);
      else drawPath(rctx, e.pts, 0, 'open', 0);
    }

    // tiles: a crop of the map around each landmark, beside its section
    for (const [id, n] of Object.entries(NODES)) {
      const host = resume.querySelector(`.entry[data-node="${id}"], .skills[data-node="${id}"]`);
      if (!host) continue;
      const [tile, tctx] = makeCanvas(48, 36);
      tctx.drawImage(roads, n.x - 24, n.y - 36, 48, 36, 0, 0, 48, 36);
      tile.className = 'node-tile';
      tile.setAttribute('aria-hidden', 'true');
      host.prepend(tile);
      host.classList.add('has-tile');
    }

    // the hero map: node pads, Shrey at home, and a link per place
    const [map, mctx] = makeCanvas(480, 216);
    mctx.drawImage(roads, 0, 0);
    for (const n of Object.values(NODES)) {
      disc(mctx, n.x, n.y, 5, 'ink.0');
      disc(mctx, n.x, n.y, 4, 'red.2');
    }
    drawFrame(mctx, A.hero.idle[0], NODES.home.x - 5, NODES.home.y - 20, false, 10);
    map.setAttribute('aria-hidden', 'true');

    const fig = document.createElement('figure');
    fig.className = 'pagemap';
    const art = document.createElement('div');
    art.className = 'pagemap__art';
    art.appendChild(map);
    for (const [id, n] of Object.entries(NODES)) {
      const a = document.createElement('a');
      a.className = 'pagemap__pin';
      a.href = '#' + (ANCHOR[id] || id);
      a.textContent = n.name;
      a.title = n.sub;
      a.style.left = (n.x / 480) * 100 + '%';
      a.style.top = ((n.y > 100 ? n.y + 7 : n.y + 13) / 216) * 100 + '%';
      art.appendChild(a);
    }
    const cap = document.createElement('figcaption');
    cap.innerHTML = '<b>Shrey Island</b> is the game’s map. Each landmark is a level built from one part of this résumé.<span class="pagemap__hint"> Pick a name to jump to that part.</span>';
    fig.append(art, cap);
    resume.querySelector('.resume__head').appendChild(fig);
    resume.classList.add('has-art');

    // the bar: Shrey's head as the mark, links from the section headings
    const [head, hctx] = makeCanvas(16, 13);
    hctx.drawImage(A.hero.idle[0].c, 0, 0, 16, 13, 0, 0, 16, 13);
    head.className = 'pagebar__mark';
    head.setAttribute('aria-hidden', 'true');
    $('pagebar-brand').prepend(head);
    const play = document.createElement('a');
    play.className = 'pbtn pbtn--primary pagefoot-play';
    play.href = '#play';
    play.textContent = 'Play the game ▶';
    resume.querySelector('.resume__foot').appendChild(play);

    const links = $('pagebar-links');
    for (const h of resume.querySelectorAll('.resume__section > h2[id]')) {
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      links.appendChild(a);
    }
  }

  return {
    get on() { return on; },
    sync, go, reveal,
  };
}

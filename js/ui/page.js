// The website view: the same <main id="resume"> as a scrollable portfolio,
// with the game one click away. The URL picks the view: #play (or ?play,
// ?level=) is the game, any other hash (#page, or a section id like #ornl)
// is the website, and a plain visit is the default from boot.js. The
// toggles are plain links, so Back moves between the two.
//
// page-art.js builds the website's extras from the résumé and the game's
// art; page-fx.js adds the light game layer on top.

import { FLAGS } from '../config.js';
import { decoratePage, ANCHOR } from './page-art.js';
import { startFx } from './page-fx.js';

const $ = (id) => document.getElementById(id);

export function createPage({ game, display, defaultView }) {
  const root = document.documentElement;
  const resume = $('resume');
  const titleEl = $('title');
  let on = false;

  const { badges } = decoratePage(game);
  const fx = startFx({ game, badges, isOn: () => on });

  // the game must not read keys while the page is up: arrows and space scroll
  document.addEventListener('keydown', (e) => { if (on) e.stopPropagation(); }, true);
  window.addEventListener('hashchange', () => sync());
  window.addEventListener('popstate', () => sync());

  function wanted() {
    const h = location.hash.slice(1);
    if (h === 'play') return 'game';
    if (h) return 'page';
    if (FLAGS.level || new URLSearchParams(location.search).has('play')) return 'game';
    return defaultView;
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
    fx.refresh();
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
    const url = view === defaultView ? location.pathname : view === 'page' ? '#page' : '#play';
    history.pushState(null, '', url);
    sync(false, quiet);
  }

  // the résumé dialog was asked for while the page is up: show the place here
  function reveal(node) {
    const el = node && (document.getElementById(ANCHOR[node] || node) || resume.querySelector(`[data-node="${node}"]`));
    if (el) el.scrollIntoView({ block: 'start' });
  }

  return {
    get on() { return on; },
    sync, go, reveal,
  };
}

// The website view: the same <main id="resume"> as a scroll timeline
// (js/site/timeline.js), with the game behind a small "Play the game"
// link. The URL picks the view: #play (or ?play, ?level=) is the game, any
// other hash (#page, or an id like #ornl) is the website, and a plain
// visit is the default from boot.js. The toggles are plain links, so Back
// moves between the two.
//
// page-art.js builds the bar and the footer link; page-fx.js the thin
// progress line under the bar.

import { FLAGS } from '../config.js';
import { decoratePage } from './page-art.js';
import { startFx } from './page-fx.js';
import { createTimeline } from '../site/timeline.js';

const $ = (id) => document.getElementById(id);

// old section links (the grouped résumé's headings) → the stop they start with
const SECTION = { 'h-experience': 'ornl', 'h-projects': 'vincio', 'h-education': 'neu', 'h-skills': 'skills' };

export function createPage({ game, display, defaultView }) {
  const root = document.documentElement;
  const resume = $('resume');
  const titleEl = $('title');
  let on = false;

  decoratePage(game);
  const timeline = createTimeline({ game });
  const fx = startFx({ isOn: () => on });

  // the game must not read keys while the page is up: arrows and space scroll
  document.addEventListener('keydown', (e) => { if (on) e.stopPropagation(); }, true);
  window.addEventListener('hashchange', () => sync());
  window.addEventListener('popstate', () => sync());

  // in-page links show the stop that holds their target, scene and all
  document.addEventListener('click', (e) => {
    if (!on || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id && document.getElementById(id);
    if (!el || el === resume || !resume.contains(el)) return;
    e.preventDefault();
    history.pushState(null, '', '#' + id);
    reveal(el, true);
  });

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

  function reveal(el, smooth = false) {
    if (SECTION[el.id] && timeline.revealNode(SECTION[el.id], smooth)) return;
    if (!timeline.reveal(el, smooth)) el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'instant' });
  }

  function sync(initial = false, quiet = false) {
    if (wanted() !== 'page') { hide(quiet); return; }
    if (!on) { show(initial); return; }
    const el = target();                     // Back / Forward between places on the page
    if (el) reveal(el);
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
    timeline.mount();
    const el = target();
    if (el) reveal(el);
    else if (!initial) window.scrollTo({ top: 0, behavior: 'instant' });
    if (!initial) resume.focus({ preventScroll: true });
    fx.refresh();
  }

  // back in a level: start paused, the way returning to the tab does
  function hide(quiet) {
    if (on) timeline.unmount();
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
  function place(node) {
    if (node && timeline.revealNode(node)) return;
    const el = node && resume.querySelector(`[data-node="${node}"]`);
    if (el) reveal(el);
  }

  return {
    get on() { return on; },
    sync, go,
    reveal: place,
    timeline,
  };
}

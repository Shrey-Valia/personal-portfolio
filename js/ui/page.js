// The two views and the URL. #play (or ?play, ?level=) is the game, any
// other hash (#page, or an id like #ornl) is the website, and a plain visit
// is the default from boot.js. The toggles are plain links, so Back moves
// between the two. The website is the scroll timeline (js/timeline); the
// game is loaded the first time it's wanted (loadGame) and then kept.

import { FLAGS } from '../config.js';

const $ = (id) => document.getElementById(id);

// the game's place ids → the page (the rest are stop ids already)
const PLACE = { home: 'top', lighthouse: 'contact', tree: 'skills' };
// old section links → the stop they start with
const SECTION = { 'h-experience': 'ornl', 'h-projects': 'vincio', 'h-education': 'droid', 'h-skills': 'skills', resume: 'intro' };

export function createPage({ timeline, loadGame, defaultView }) {
  const root = document.documentElement;
  const resume = $('resume');
  let on = false, game = null;

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
    if (!el || !resume.contains(el) || a.id === 'skip') return;
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
    if (wanted() !== 'page') { hide(quiet, initial); return; }
    if (!on) { show(initial); return; }
    const el = target();                     // Back / Forward between places on the page
    if (el) reveal(el);
  }

  function show(initial) {
    if (on) return;
    on = true;
    if (game) game.leave();
    root.classList.add('view-page');
    timeline.start();
    const el = target();
    if (el) reveal(el);
    else if (!initial) window.scrollTo({ top: 0, behavior: 'instant' });
    if (!initial) resume.focus({ preventScroll: true });
  }

  // into the game: load it the first time, then wake it
  function hide(quiet, initial) {
    const was = on;
    if (on) timeline.stop();
    on = false;
    root.classList.remove('view-page');
    if (was) window.scrollTo({ top: 0, behavior: 'instant' });
    if (game) { game.enter(quiet); return; }
    loadGame().then((g) => {
      game = g;
      if (!on) g.enter(quiet, initial || !was);
    }).catch((err) => {
      console.error('[portfolio] the game failed to load; back to the website.', err);
      go('page');
    });
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
    const el = node && document.getElementById(PLACE[node] || node);
    if (el) reveal(el);
  }

  return {
    get on() { return on; },
    sync, go,
    reveal: place,
  };
}

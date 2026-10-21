// Entry point: a small router. The website (the scroll timeline) is the
// landing view; the game loads only when someone opens it (#play, ?play,
// ?level=), with import('./game/start.js'), so none of its code downloads
// with the page. Any failure leaves the plain résumé, which is the page
// itself, so the content is never lost.

import { FLAGS } from './config.js';
import { createTimeline } from './timeline/index.js';
import { createPage } from './ui/page.js';
import { decorate } from './ui/cards.js';

// What a plain visit lands on: 'page' (the website) or 'game' (the title
// screen). #play / ?play and #page always pick one explicitly. The head
// script in index.html makes the same call for the first paint; change both.
const DEFAULT_VIEW = 'page';

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

function fail(err) {
  console.error('[portfolio] the page failed to start; showing the plain résumé.', err);
  const resume = $('resume');
  if (resume && resume.parentElement !== document.body) document.body.appendChild(resume);
  root.classList.remove('js', 'view-page', 'app-ready', 'game-ready');
}

function boot() {
  if (!root.classList.contains('js')) return;
  decorate();
  const timeline = createTimeline({ root: $('resume'), debug: FLAGS.debug });
  let loading = null;
  const loadGame = () => loading || (loading = import('./game/start.js').then((m) => m.startGame({ page })));
  const page = createPage({ timeline, loadGame, defaultView: DEFAULT_VIEW });
  root.classList.add('app-ready');
  page.sync(true);
}

try { boot(); } catch (err) { fail(err); }

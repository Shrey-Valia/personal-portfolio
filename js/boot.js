// Entry point. Builds everything, then flips the page from résumé to game.
// Any failure puts the plain résumé back, so the content is never lost.

import { FLAGS, motionQuery } from './config.js';
import { createDisplay } from './engine/display.js';
import { createInput, createTouch } from './engine/input.js';
import { createAudio } from './engine/audio.js';
import { createSave } from './engine/save.js';
import { createParticles } from './engine/particles.js';
import { buildHero } from './art/sprites/hero.js';
import { buildItems } from './art/sprites/items.js';
import { buildActors } from './art/sprites/actors.js';
import { buildMapBase } from './art/mapart.js';
import { getBackground } from './art/backgrounds.js';
import { indexContent } from './game/content.js';
import { createProgress } from './game/progress.js';
import { Game } from './game/game.js';
import { LEVELS, levelFacts } from './game/levels/index.js';
import { createHud } from './ui/hud.js';
import { createDialogs } from './ui/dialogs.js';
import { createResume } from './ui/resume.js';
import { createPage } from './ui/page.js';

// What a visit with no hash lands on: 'game' (the title screen) or 'page'
// (the scrollable portfolio). #play and #page always pick one explicitly.
const DEFAULT_VIEW = 'game';

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

function fail(err) {
  console.error('[portfolio] game failed to start; showing the résumé instead.', err);
  const resume = $('resume');
  if (resume && resume.parentElement !== document.body) document.body.appendChild(resume);
  root.classList.remove('js', 'game-ready');
}

function boot() {
  if (!root.classList.contains('js')) return;
  const t0 = performance.now();
  // canvas text uses Fredoka; ask for it now (frames redraw, so no need to wait)
  if (document.fonts && document.fonts.load) {
    ['500', '600', '700'].forEach((w) => document.fonts.load(`${w} 16px Fredoka`).catch(() => {}));
  }

  const content = indexContent();
  const save = createSave(FLAGS.fresh);
  const progress = createProgress(save);
  content.markFound(progress.facts);

  const items = buildItems();
  const art = { hero: buildHero(), items, actors: buildActors(), mapBase: buildMapBase(), ...items };
  const reduced = motionQuery.matches;
  const particles = createParticles();
  particles.setBudget(reduced ? 0.25 : 1);
  const audio = createAudio();

  const titleEl = $('title');
  const touchEl = $('touch');
  let game = null;

  const input = createInput({
    onMeta(action) {
      if (!game || game.ui.page.on) return false;
      const dialogOpen = !!document.querySelector('dialog[open]');
      if (action === 'resume') { game.openResume(); return true; }
      if (action === 'mute') { game.toggleMute(); return true; }
      if (dialogOpen || !titleEl.hidden) return false;
      if (action === 'pause') return game.openPause();
      if (action === 'map') return game.openPause('map');
      return false;
    },
    onDevice(kind) {
      if (kind === 'keys' && root.classList.contains('touch-on')) { root.classList.remove('touch-on'); orient(); }
    },
  });
  createTouch(touchEl, input);

  const display = createDisplay($('screen'), $('stage'), $('viewport'), (d, changed) => {
    if (changed && game && game.scene && game.scene.room) {
      const s = game.scene;
      s.bg = getBackground(s.room.theme || s.def.theme, d.W);
    }
  });

  game = new Game({ display, input, audio, progress, content, art, particles, reduced });

  const hud = createHud(game);
  const dialogs = createDialogs(game);
  const resume = createResume(game);
  game.ui = {
    hud, dialogs, resume,
    title(on) {
      titleEl.hidden = !on;
      if (!on) game.focusStage();
    },
    touchLive(on) { touchEl.classList.toggle('is-live', on); },
  };
  const page = createPage({ game, display, defaultView: DEFAULT_VIEW });
  game.ui.page = page;

  // ─── wiring ──────────────────────────────────────────────────
  $('title-play').textContent = progress.started ? '▶ Continue' : '▶ Play';
  $('title-play').addEventListener('click', () => game.play());
  // "View as page", the bar's "Play the game" and the skip link are plain
  // hash links; page.js switches views on the hash change

  document.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = b.dataset.action;
      if (a === 'resume') game.openResume();
      else if (a === 'mute') game.toggleMute();
      else if (a === 'pause') game.openPause();
      else if (a === 'map') { if (!game.openPause('map')) game.banner('<b>You’re already on the map</b>', 1500); }
    });
    // after a mouse click, give the keyboard back to the game
    b.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') setTimeout(() => { if (!document.querySelector('dialog[open]')) game.focusStage(); }, 0); });
  });

  $('screen').addEventListener('pointerdown', (e) => {
    const s = game.scene;
    if (s && s.pointer && titleEl.hidden && !game.paused.size) {
      const p = display.toGame(e.clientX, e.clientY);
      s.pointer(p.x, p.y);
    }
  });

  // touch: show on-screen controls; portrait phones get the rotate card
  function orient() {
    const portrait = root.classList.contains('touch-on') && window.innerHeight > window.innerWidth;
    root.classList.toggle('portrait-touch', portrait);
    if (portrait && !root.classList.contains('rotate-dismissed')) game.pause('rotate'); else game.resume('rotate');
  }
  const coarse = window.matchMedia('(pointer: coarse)');
  if (coarse.matches) root.classList.add('touch-on');
  window.addEventListener('touchstart', () => { if (!root.classList.contains('touch-on')) { root.classList.add('touch-on'); orient(); } }, { passive: true });
  window.addEventListener('resize', orient);
  $('rotate-play').addEventListener('click', () => { root.classList.add('rotate-dismissed'); orient(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause('hidden');
      audio.suspend();
      input.clear();
    } else {
      game.resume('hidden');
      if (page.on) return;
      audio.resume();
      if (game.scene && game.scene.def && !document.querySelector('dialog[open]')) game.openPause();
    }
  });

  // sound stays off unless the visitor turned it on; browsers need a gesture first
  audio.setMuted(true);
  hud.setMute(true);
  if (progress.settings.muted === false) {
    const wake = () => {
      if (page.on) return;                      // wait for the game view
      audio.setMuted(false); hud.setMute(false);
      window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake);
    };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
  }

  display.fit();
  orient();
  hud.refresh();

  if (FLAGS.debug) {
    const cov = content.coverage(LEVELS, levelFacts);
    console.log(`[portfolio] coverage: ${cov.homed}/${cov.total} facts homed, ${cov.dangling.length} dangling, skills ${cov.skills}, credits ${cov.credits}`);
    if (cov.unhomed.length) console.log('[portfolio] facts without a level yet:', cov.unhomed.join(', '));
    if (cov.dangling.length) console.warn('[portfolio] level refs with no résumé fact:', cov.dangling.join(', '));
    console.log(`[portfolio] boot ${Math.round(performance.now() - t0)} ms`);
    window.__game = game;                       // for stepping frames from devtools
  }

  root.classList.add('game-ready');
  game.start();
  page.sync(true);
  if (!page.on && titleEl.hidden === false) $('title-play').focus({ preventScroll: true });
}

try { boot(); } catch (err) { fail(err); }

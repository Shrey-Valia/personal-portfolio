// Native <dialog>s: fact cards, the pause menu, the level-clear tally and
// game over. showModal() gives top-layer stacking, an inert page behind,
// Esc to close, and focus return for free.

import { levelFacts, LEVELS } from '../game/levels/index.js';

const $ = (id) => document.getElementById(id);

export function createDialogs(game) {
  const card = $('card'), pause = $('pause'), tally = $('tally'), over = $('gameover');
  const closers = new Map();

  function open(dlg, reason, onClose) {
    if (dlg.open) return;
    game.pause(reason);
    game.audio.duck(true);
    closers.set(dlg, onClose || null);
    dlg.showModal();
  }

  for (const dlg of [card, pause, tally, over]) {
    dlg.addEventListener('close', () => {
      const fn = closers.get(dlg);
      closers.delete(dlg);
      game.audio.duck(false);
      game.input.lockAll();                 // the closing key must not also act in-game
      if (fn) fn(dlg.returnValue);
      game.resume(dlg.dataset.reason);
      game.focusStage();
    });
  }

  // ─── cards ──────────────────────────────────────────────────
  $('card-ok').addEventListener('click', () => card.close());
  card.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') { e.preventDefault(); card.close(); }
  });
  card.addEventListener('click', (e) => { if (e.target === card) card.close(); });

  function openCard(id) {
    const f = game.content.get(id);
    if (!f) return;
    $('card-kicker').textContent = f.kicker;
    $('card-title').textContent = f.title;
    const body = $('card-body');
    body.textContent = '';
    body.appendChild(game.content.clone(id));
    let here = '';
    const scene = game.scene;
    if (scene && scene.factIds) {
      const n = scene.factIds.filter((x) => game.progress.hasFact(x)).length;
      here = `${n}/${scene.factIds.length} here · `;
    }
    $('card-count').textContent = `Facts: ${here}${game.progress.facts.size}/${game.content.total} total`;
    card.dataset.reason = 'card';
    open(card, 'card');
    $('card-ok').focus();
  }

  // ─── pause menu ─────────────────────────────────────────────
  function syncPause() {
    const s = game.progress.settings;
    $('menu-mute').textContent = 'Sound: ' + (game.audio.muted ? 'off' : 'on');
    $('menu-assist').textContent = 'Assist mode: ' + (s.assist ? 'on' : 'off');
    const node = game.scene && game.scene.def && game.scene.def.node;
    $('menu-skip').hidden = !(node && game.progress.gameOvers(node) >= 2);
  }

  pause.addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]');
    if (!b) return;
    const a = b.dataset.menu;
    if (a === 'continue') pause.close();
    else if (a === 'map') { pause.close(); game.leaveToMap(); }
    else if (a === 'resume') { pause.close(); game.openResume(); }
    else if (a === 'mute') { game.toggleMute(); syncPause(); }
    else if (a === 'assist') { game.progress.setting('assist', !game.progress.settings.assist); syncPause(); }
    else if (a === 'skip') { pause.close(); game.skipLevel(); }
    else if (a === 'reset') {
      if (window.confirm('Reset all progress? Facts found, cleared levels and bits will be erased.')) {
        pause.close(); game.resetProgress();
      }
    }
  });

  function openPause(focus) {
    syncPause();
    pause.dataset.reason = 'menu';
    open(pause, 'menu');
    const target = focus === 'map' ? pause.querySelector('[data-menu="map"]') : pause.querySelector('[data-menu="continue"]');
    target.focus();
  }

  // ─── level clear ────────────────────────────────────────────
  $('tally-ok').addEventListener('click', () => tally.close());
  function openTally(s, onDone) {
    $('tally-title').textContent = s.title;
    const list = $('tally-list');
    list.innerHTML = '';
    const rows = [['Facts', `${s.facts}/${s.factsTotal}`], ['Bits', String(s.bits)], ['Bugs fixed', String(s.bugs)],
      ['Time', `${Math.floor(s.time / 60)}:${String(s.time % 60).padStart(2, '0')}`]];
    for (const [k, v] of rows) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      list.append(dt, dd);
    }
    const missed = s.factsTotal - s.facts;
    $('tally-note').textContent = missed > 0
      ? `${missed} fact${missed > 1 ? 's' : ''} missed here. Replay the level, or read ${missed > 1 ? 'them' : 'it'} in the résumé.`
      : '';
    tally.dataset.reason = 'tally';
    open(tally, 'tally', onDone);
    $('tally-ok').focus();
  }

  // ─── game over ──────────────────────────────────────────────
  $('over-ok').addEventListener('click', () => over.close());
  function openGameOver(onDone) {
    over.dataset.reason = 'gameover';
    open(over, 'gameover', onDone);
    $('over-ok').focus();
  }

  return {
    openCard, openPause, openTally, openGameOver,
    closeAll() { for (const d of [card, pause, tally, over]) if (d.open) d.close(); },
    anyOpen() { return [card, pause, tally, over].some((d) => d.open); },
  };
}

export { levelFacts, LEVELS };

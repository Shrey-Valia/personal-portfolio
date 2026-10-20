// The résumé dialog doubles as the in-game log: found markers per fact,
// a fast-travel strip, and a "Play level" chip on each section.

import { NODES } from '../game/map.js';
import { LEVELS } from '../game/levels/index.js';

const $ = (id) => document.getElementById(id);

export function createResume(game) {
  const dlg = $('resume-dialog');
  const slot = $('resume-slot');
  const resume = $('resume');
  const warp = $('warp');
  let prevFocus = null;

  slot.appendChild(resume);            // the résumé moves into the dialog

  // play chips on each section that has a level
  for (const el of resume.querySelectorAll('[data-node]')) {
    const node = el.dataset.node;
    if (!LEVELS[node] || el.querySelector(':scope > .play-chip')) continue;
    if (el.tagName === 'UL') continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'play-chip';
    b.textContent = '▶ Play this level';
    b.addEventListener('click', () => game.warp(node));
    const head = el.querySelector(':scope > .entry__head, :scope > [data-fact]');
    (head || el.firstElementChild).after(b);
  }

  function buildWarp() {
    warp.innerHTML = '';
    for (const [id, n] of Object.entries(NODES)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (LEVELS[id] ? '▶ ' : '') + n.name;
      b.dataset.state = game.progress.cleared.has(id) ? 'cleared' : LEVELS[id] ? 'open' : 'soon';
      b.title = LEVELS[id] ? 'Play ' + n.name : n.name + ': level in progress, jump to this section';
      b.addEventListener('click', () => {
        if (LEVELS[id]) game.warp(id);
        else scrollTo(id);
      });
      warp.appendChild(b);
    }
  }

  function scrollTo(node) {
    const target = node && resume.querySelector(`[data-node="${node}"]`);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      target.animate([{ background: 'rgba(255, 209, 102, 0.6)' }, { background: 'transparent' }], { duration: 1400 });
    }
  }

  $('resume-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    game.resume('resume');
    game.input.lockAll();
    if (prevFocus && document.contains(prevFocus) && prevFocus.offsetParent) prevFocus.focus();
    else game.focusStage();
  });

  return {
    get isOpen() { return dlg.open; },
    open(node) {
      if (dlg.open) { scrollTo(node); return; }
      prevFocus = document.activeElement;
      buildWarp();
      $('resume-found').textContent = `Found ${game.progress.facts.size} of ${game.content.total}`;
      game.pause('resume');
      dlg.showModal();
      slot.scrollTop = 0;
      if (node) scrollTo(node);
      $('resume-close').focus();
    },
    close() { if (dlg.open) dlg.close(); },
  };
}
